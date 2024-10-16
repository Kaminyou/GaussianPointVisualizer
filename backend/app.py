import os
import pickle
from dataclasses import dataclass
from http import HTTPStatus
from io import BytesIO

import numpy as np
import numpy.typing as npt
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from PIL import Image

from utils.contour import Contour

# @dataclass
# class Contour:
#     segments: npt.NDArray[int]
#     center: npt.NDArray[int]
#     intensity: float


app = Flask(__name__)
CORS(app)


@app.route('/api/get_image_names', methods=['GET'])
def get_image_names():
    image_name_set = set()
    for folder in os.listdir('data/'):
        if os.path.isdir(os.path.join('data/', folder)):
            image_name_set.add(folder)
    
    image_name_list = []
    for image_name in image_name_set:
        if not os.path.exists(f'data/{image_name}/detections.pkl'):
            continue
        if not os.path.exists(f'data/{image_name}/image.png'):
            continue
        image_name_list.append(image_name)

    data = {
        'images': image_name_list,
    }
    return jsonify(data)


@app.route('/api/get_image', methods=['GET'])
def get_image():
    selected_image_name = request.args.get('name')
    try:
        image = Image.open(f'data/{selected_image_name}/image.png')
        image_stream = BytesIO()
        image.save(image_stream, format='PNG')
        image_stream.seek(0)
        return send_file(image_stream, mimetype='image/png')

    except Exception:
        image = np.ones((1000, 1000, 3), dtype=np.uint8) * 255
        image = Image.fromarray(image)
        image_stream = BytesIO()
        image.save(image_stream, format='PNG')
        image_stream.seek(0)
        return send_file(image_stream, mimetype='image/png')


@app.route('/api/get_points')
def get_points():
    selected_image_name = request.args.get('name')

    try:
        with open(f'data/{selected_image_name}/detections.pkl', 'rb') as f:
            contours = pickle.load(f)

        points = []
        intensities = []
        for contour in contours:
            points.append([int(contour.center[0]), int(contour.center[1])])
            intensities.append(contour.intensity)
        data = {
            'points': points,
            'intensities': intensities,
        }
        return jsonify(data)
    except Exception as e:
        print(e)
        data = {
            'points': [],
            'intensities': [],
        }
        return jsonify(data)


@app.route('/api/version', methods=['GET'])
def get_version():
    '''
    Return the api version
    '''
    try:
        return {"version": "v0.1.0"}, HTTPStatus.OK

    except Exception as e:
        print(e)
        return {"msg": "Internal Server Error!"}, HTTPStatus.INTERNAL_SERVER_ERROR


@app.route('/get-pointcloud', methods=['GET'])
def get_pointcloud():
    # Load the .npy file (replace 'path_to_file.npy' with your actual file path)
    point_cloud_and_labels = np.load('data/day19_sample1_0_output_clean.npy', allow_pickle=True).item()
    point_cloud = point_cloud_and_labels['points']
    labels = point_cloud_and_labels['labels']

    max_values = point_cloud.max(axis=0)
    min_values = point_cloud.min(axis=0)
    center = (max_values + min_values) / 2
    rng = (point_cloud.max(axis=0) - point_cloud.min(axis=0)).max()
    point_cloud = (point_cloud - center) / rng * 100
    point_cloud_list = point_cloud.tolist()

    gaussian_data = np.load('data/day19_sample1_0_output_clean_gaussians.npy', allow_pickle=True).item()  # Assuming a dictionary structure
    means = gaussian_data['means']
    covariances = gaussian_data['covs']

    means = (means - center) / rng * 100
    covariances = covariances / rng * 100
    # print(point_cloud.max(axis=0))
    # print(point_cloud.min(axis=0))
    # point_cloud = (point_cloud - min_value) / (max_value - min_value)
    
    # Convert to a list of lists for JSON serialization
    # point_cloud_list = point_cloud.tolist()
    # point_cloud_list = np.random.uniform(low=-100.0, high=100.0, size=(10, 3))
    # point_cloud_list = point_cloud_list.tolist()
    # print(point_cloud_list)

    response = {
        'point_cloud': point_cloud_list,  # Point cloud data
        'labels': labels.tolist(),
        'gaussians': {
            'means': means.tolist(),  # Gaussian means
            'covariances': covariances.tolist()  # Gaussian covariance matrices
        }
    }
    
    return jsonify(response)


if __name__ == '__main__':
    app.debug = False
    app.run(host="0.0.0.0", port=5000)

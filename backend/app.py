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
from matplotlib import cm

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
    point_cloud_and_labels = np.load('data/day9_sample1_0_output_clean.npy', allow_pickle=True).item()
    point_cloud = point_cloud_and_labels['points']
    labels = point_cloud_and_labels['labels']
    new_labels = point_cloud_and_labels['new_labels']

    max_values = point_cloud.max(axis=0)
    min_values = point_cloud.min(axis=0)
    center = (max_values + min_values) / 2
    rng = (point_cloud.max(axis=0) - point_cloud.min(axis=0)).max()
    point_cloud = (point_cloud - center) / rng * 100
    point_cloud_list = point_cloud.tolist()

    gaussian_data = np.load('data/day9_sample1_0_output_clean_gaussians.npy', allow_pickle=True).item()  # Assuming a dictionary structure
    means = gaussian_data['means']
    covariances = gaussian_data['covs']
    densities_log = gaussian_data['densities_log']

    min_density = densities_log.min()
    max_density = densities_log.max()
    normalized_densities = (densities_log - min_density) / (max_density - min_density)

    # Map normalized densities to RGB colors using coolwarm colormap
    colormap_name = request.args.get('colormap', 'coolwarm')
    colormap = cm.get_cmap(colormap_name)
    colors = [colormap(density)[:3] for density in normalized_densities]  # Extract RGB values
    pointcolors = []
    for new_label in new_labels:
        pointcolors.append(colors[new_label])

    gradient_colors = [colormap(i / 100)[:3] for i in range(101)]  # 101 steps from 0 to 1
    gradient_colors = [[int(c * 255) for c in color] for color in gradient_colors]  # Convert to 0-255 range

    explanation_text = "This colorbar represents density values: cool colors indicate lower densities, while warm colors indicate higher densities."

    means = (means - center) / rng * 100
    covariances = covariances / rng * 100

    response = {
        'point_cloud': point_cloud_list,  # Point cloud data
        "colors": pointcolors,  # Send colors as an array of RGB lists
        'min_density': float(min_density),
        'max_density': float(max_density),
        'explanation_text': explanation_text,
        'color_gradient': gradient_colors,
    }
    
    return jsonify(response)


if __name__ == '__main__':
    app.debug = False
    app.run(host="0.0.0.0", port=5000)

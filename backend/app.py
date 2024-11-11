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


@app.route('/api/get_data_names', methods=['GET'])
def get_data_names():
    data_name_set = set()
    for data_name in os.listdir('data'):
        if not 'npy' in data_name:
            continue
        if 'gaussian' in data_name:
            continue
        data_name_base = data_name.replace('.npy', '')
        if not os.path.exists(os.path.join('data', f'{data_name_base}_gaussians.npy')):
            continue
        data_name_set.add(data_name_base)

    data = {
        'data_name': sorted(list(data_name_set)),
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


@app.route('/api/get-pointcloud', methods=['GET'])
def get_pointcloud():
    # Load the .npy file (replace 'path_to_file.npy' with your actual file path)
    data_name = request.args.get('dataname', None)
    if data_name is None:
        response = {
            'point_cloud': [],
            "colors": [],
            'min_density': float(0),
            'max_density': float(1),
            'explanation_text': 'Nothing selected',
            'color_gradient': [],
        }
        return jsonify(response)

    point_cloud_and_labels = np.load(f'data/{data_name}.npy', allow_pickle=True).item()
    point_cloud = point_cloud_and_labels['points']
    labels = point_cloud_and_labels['labels']
    new_labels = point_cloud_and_labels['new_labels']

    max_values = point_cloud.max(axis=0)
    min_values = point_cloud.min(axis=0)
    center = (max_values + min_values) / 2
    rng = (point_cloud.max(axis=0) - point_cloud.min(axis=0)).max()
    point_cloud = (point_cloud - center) / rng * 100
    point_cloud_list = point_cloud.tolist()

    gaussian_data = np.load(f'data/{data_name}_gaussians.npy', allow_pickle=True).item()  # Assuming a dictionary structure
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

    explanation_text = "log10 density"

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

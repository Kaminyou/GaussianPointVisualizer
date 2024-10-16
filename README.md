# Point-Thresholding-Viewer

## Usage
Every image you would like to show should have the following structure in the `backend/data/`
```
backend/data/
|- image_name_folder/
    |- image.png
    |- detections.pkl
```
- image_name_folder: name of your image
- image.png: your image in a png format
- detections.pkl: a list of Contour type (`backend/utils/contour.py) saved in a pickle format

## Deploy
```
# after you change the port according to your preference
$ docker-compose up --build -d
```
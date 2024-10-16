import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import axios from 'axios';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const PointCloudAndGaussianVisualizer = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;

    camera.position.z = 500;

    // Fetch point cloud and Gaussian data from the backend
    axios.get('/get-pointcloud').then(response => {
      const { point_cloud, gaussians, labels } = response.data;
      const { means, covariances } = gaussians;

      // Create a color map for each unique label
      const uniqueLabels = [...new Set(labels)];
      const colorMap = {};
      uniqueLabels.forEach((label, index) => {
        colorMap[label] = new THREE.Color(`hsl(${(index / uniqueLabels.length) * 360}, 100%, 50%)`);  // Assign unique color to each label
      });

      // Render the point cloud with colors based on labels
      renderPointCloud(scene, point_cloud, labels, colorMap);

      // Render the Gaussians as ellipsoids with the same color as the points
      means.forEach((mean, index) => {
        const covariance = covariances[index];
        const label = uniqueLabels[index];
        const color = colorMap[label];  // Get the color for this label

        // Create the ellipsoid representing the Gaussian
        const ellipsoid = createEllipsoidFromCovariance(mean, covariance, color);

        scene.add(ellipsoid);  // Add ellipsoid to the scene
      });

    }).catch(err => {
      console.error("Error fetching point cloud and Gaussian data", err);
    });

    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      mountRef.current.removeChild(renderer.domElement);
    };
  }, []);

  // Helper function to create ellipsoid from covariance matrix with a specific color
  const createEllipsoidFromCovariance = (mean, covariance, color) => {
    const eig = window.numeric.eig(covariance);  // Eigen decomposition for covariance matrix
    const eigenValues = eig.lambda.x;
    const eigenVectors = eig.E.x;

    // Use eigenvalues for scaling the ellipsoid and eigenvectors for rotation
    const radii = new THREE.Vector3(Math.sqrt(eigenValues[0]), Math.sqrt(eigenValues[1]), Math.sqrt(eigenValues[2]));

    const geometry = new THREE.SphereGeometry(1, 32, 32);  // Create a unit sphere
    const material = new THREE.MeshBasicMaterial({ 
      color: color,   // Use the color corresponding to the label
      transparent: true, // Enable transparency
      opacity: 0.2,      // Set opacity to 50%
      wireframe: false   // You can change to `true` if you want wireframe
    });
    const ellipsoid = new THREE.Mesh(geometry, material);

    // Scale according to the eigenvalues (square root gives standard deviation)
    ellipsoid.scale.set(radii.x, radii.y, radii.z);

    // Rotate according to the eigenvectors
    const rotationMatrix = new THREE.Matrix4();
    rotationMatrix.set(
      eigenVectors[0][0], eigenVectors[0][1], eigenVectors[0][2], 0,
      eigenVectors[1][0], eigenVectors[1][1], eigenVectors[1][2], 0,
      eigenVectors[2][0], eigenVectors[2][1], eigenVectors[2][2], 0,
      0, 0, 0, 1
    );
    ellipsoid.applyMatrix4(rotationMatrix);

    // Set the position of the ellipsoid at the mean
    ellipsoid.position.set(mean[0], mean[1], mean[2]);

    return ellipsoid;
  };

  // Helper function to render point cloud with colors based on labels
  const renderPointCloud = (scene, points, labels, colorMap) => {
    const positions = new Float32Array(points.flat());
    const colors = new Float32Array(points.length * 3);  // For storing color data

    // Set color for each point based on its label
    points.forEach((point, index) => {
      const label = labels[index];
      const color = colorMap[label];  // Get the color for this point's label

      // Set the color for this point
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ 
      vertexColors: true,  // Enable vertex colors to use per-point coloring
      size: 0.3
    });

    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);
  };

  return <div ref={mountRef} style={{ width: '100vw', height: '100vh' }}></div>;
};

export default PointCloudAndGaussianVisualizer;
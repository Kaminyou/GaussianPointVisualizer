import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import axios from 'axios';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const PointCloudAndGaussianVisualizer = () => {
  const mountRef = useRef(null);
  const colorbarRef = useRef(null);
  const [densityRange, setDensityRange] = useState({ min: 0, max: 1 });
  const [explanationText, setExplanationText] = useState('');
  const [colorGradient, setColorGradient] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [colormap, setColormap] = useState('coolwarm');  // Colormap state

  // Available colormaps
  const colormaps = ['coolwarm', 'viridis', 'plasma', 'inferno', 'magma', 'cividis'];

  useEffect(() => {
    fetchPointCloudData(colormap);
  }, [colormap]);

  const fetchPointCloudData = (selectedColormap) => {
    setLoading(true);
    setProgress(0);
  
    // Clear any existing renderer
    if (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }
  
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);
  
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    camera.position.z = 500;
  
    // Axios request with progress handling
    axios.get(`/api/get-pointcloud?colormap=${selectedColormap}`, {
      onDownloadProgress: (progressEvent) => {
        let total = progressEvent.total || 1024 * 1024 * 10;
        const percentage = Math.round((progressEvent.loaded * 100) / total);
        setProgress(Math.min(percentage, 100));
      }
    })
      .then(response => {
        const { point_cloud, colors, min_density, max_density, explanation_text, color_gradient } = response.data;
  
        setDensityRange({ min: min_density, max: max_density });
        setExplanationText(explanation_text);
        setColorGradient(color_gradient);
  
        // Clear existing objects in the scene
        while (scene.children.length > 0) {
          scene.remove(scene.children[0]);
        }
  
        renderPointCloudNew(scene, point_cloud, colors);
        renderColorbar(min_density, max_density, color_gradient);  // Update colorbar content
  
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching point cloud and Gaussian data", err);
        setLoading(false);
      });
  
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  
    return () => {
      if (mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  };

  const renderPointCloudNew = (scene, points, rgbcolors) => {
    const positions = new Float32Array(points.flat());
    const colors = new Float32Array(rgbcolors.flat());

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ 
      vertexColors: true,
      size: 0.3
    });

    const pointCloud = new THREE.Points(geometry, material);
    scene.add(pointCloud);
  };

  const renderColorbar = (minDensity, maxDensity, colorGradient) => {
    const canvas = colorbarRef.current;
    const ctx = canvas.getContext('2d');

    colorGradient.forEach((color, i) => {
      const [r, g, b] = color;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.fillRect((canvas.width / colorGradient.length) * i, 0, canvas.width / colorGradient.length, canvas.height);
    });

    ctx.fillStyle = '#000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(minDensity.toFixed(2), 20, canvas.height - 5);
    ctx.fillText(maxDensity.toFixed(2), canvas.width - 20, canvas.height - 5);
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Dropdown for colormap selection */}
      <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, color: 'white'}}>
        <label htmlFor="colormap-select">Select Colormap: </label>
        <select
          id="colormap-select"
          value={colormap}
          onChange={(e) => setColormap(e.target.value)}
        >
          {colormaps.map((cmap) => (
            <option key={cmap} value={cmap}>{cmap}</option>
          ))}
        </select>
      </div>
  
      {/* Display loading bar with progress */}
      {loading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'gray'
        }}>
          <div>Loading data, please wait...</div>
          <div style={{
            width: '100%',
            backgroundColor: '#ddd',
            borderRadius: '5px',
            overflow: 'hidden',
            marginTop: '10px',
          }}>
            <div style={{
              width: `${progress}%`,
              height: '10px',
              backgroundColor: '#4caf50'
            }}></div>
          </div>
          <div style={{ marginTop: '5px' }}>{progress}%</div>
        </div>
      )}
  
      <div ref={mountRef} style={{ width: '100vw', height: '100vh' }}></div>
  
      {/* Colorbar and explanation text container */}
      <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <canvas
          ref={colorbarRef}
          width={400}
          height={20}
          style={{ border: '1px solid black' }}
        ></canvas>
        <p style={{ marginTop: '5px', color: 'white' }}>{explanationText}</p>
      </div>
    </div>
  );
};

export default PointCloudAndGaussianVisualizer;
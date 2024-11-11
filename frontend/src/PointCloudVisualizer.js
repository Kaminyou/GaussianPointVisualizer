import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import axios from 'axios';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const PointCloudAndGaussianVisualizer = () => {
  const mountRef = useRef(null);
  const colorbarRef = useRef(null);
  const clippingPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, -1), 0));  // Clipping plane along Z-axis

  const clippingPlaneZRef = useRef(new THREE.Plane(new THREE.Vector3(0, 0, -1), 0));
  const clippingPlaneXRef = useRef(new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0));
  const clippingPlaneYRef = useRef(new THREE.Plane(new THREE.Vector3(0, -1, 0), 0));

  const [clippingDistanceZ, setClippingDistanceZ] = useState(100);
  const [clippingDistanceX, setClippingDistanceX] = useState(100);
  const [clippingDistanceY, setClippingDistanceY] = useState(100);

  const pointSizeRef = useRef(0.5);  // Point size stored in useRef for direct manipulation without re-renders
  const pointCloudRef = useRef(null);  // Store reference to point cloud object

  const [densityRange, setDensityRange] = useState({ min: 0, max: 1 });
  const [explanationText, setExplanationText] = useState('');
  const [colorGradient, setColorGradient] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [colormap, setColormap] = useState('gist_rainbow');
  const [dataName, setDataName] = useState('');
  const [dataNames, setDataNames] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState('density');
  const [pointSizeDisplay, setPointSizeDisplay] = useState(pointSizeRef.current);  // Displayed point size value

  const [minValue, setMinValue] = useState(null);
  const [maxValue, setMaxValue] = useState(null);
  const colormaps = ['gist_rainbow', 'coolwarm', 'viridis', 'plasma', 'inferno', 'magma', 'cividis'];
  const visualizedProperties = ['density', 'shape'];

  useEffect(() => {
    axios.get('/api/get_data_names')
      .then(response => {
        setDataNames(response.data.data_name);
        setDataName(response.data.data_name[0]);
      })
      .catch(error => console.error("Error fetching data names:", error));
  }, []);

  useEffect(() => {
    if (dataName) {
      fetchPointCloudData(colormap, dataName, selectedProperty);
    }
  }, [colormap, dataName, selectedProperty]);

  const fetchPointCloudData = (selectedColormap, selectedDataName, selectedProperty) => {
    setLoading(true);
    setProgress(0);

    if (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.localClippingEnabled = true;  // Enable local clipping
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    camera.position.z = 500;

    axios.get(`/api/get-pointcloud?colormap=${selectedColormap}&dataname=${selectedDataName}&visualizedProperty=${selectedProperty}`, {
      onDownloadProgress: (progressEvent) => {
        let total = progressEvent.total || 1024 * 1024 * 10;
        const percentage = Math.round((progressEvent.loaded * 100) / total);
        setProgress(Math.min(percentage, 100));
      }
    })
      .then(response => {
        const { point_cloud, colors, min_value, max_value, explanation_text, color_gradient } = response.data;

        setDensityRange({ min: min_value, max: max_value });
        setExplanationText(explanation_text);
        setColorGradient(color_gradient);

        while (scene.children.length > 0) {
          scene.remove(scene.children[0]);
        }

        renderPointCloudNew(scene, point_cloud, colors);
        renderColorbar(min_value, max_value, color_gradient);
        setMinValue(min_value);
        setMaxValue(max_value);

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

  const createCircleTexture = () => {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');

    // Draw a circle in the center of the canvas
    context.beginPath();
    context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    context.fillStyle = '#FFFFFF';
    context.fill();
    context.closePath();

    return new THREE.CanvasTexture(canvas);
  };

  const circleTexture = createCircleTexture();

  const renderPointCloudNew = (scene, points, rgbcolors) => {
    const positions = new Float32Array(points.flat());
    const colors = new Float32Array(rgbcolors.flat());

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ 
      vertexColors: true,
      size: pointSizeRef.current,  // Use point size from ref
      transparent: true,
      opacity: 0.8,
      map: circleTexture,  // Use the circular texture
      clippingPlanes: [clippingPlaneZRef.current, clippingPlaneXRef.current, clippingPlaneYRef.current],
      alphaTest: 0.5  // Ensures transparency around the circular shape
    });

    const pointCloud = new THREE.Points(geometry, material);
    pointCloudRef.current = pointCloud;  // Store reference to point cloud object
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
  };

  // Update clipping plane constant based on slider
  useEffect(() => {
    clippingPlaneZRef.current.constant = clippingDistanceZ;
    clippingPlaneXRef.current.constant = clippingDistanceX;
    clippingPlaneYRef.current.constant = clippingDistanceY;
  }, [clippingDistanceZ, clippingDistanceX, clippingDistanceY]);

  const handlePointSizeChange = (e) => {
    const newSize = parseFloat(e.target.value);
    pointSizeRef.current = newSize;
    setPointSizeDisplay(newSize);  // Update local state to reflect slider value in UI

    // Update the point cloud material's size directly if it exists
    if (pointCloudRef.current) {
      pointCloudRef.current.material.size = newSize;
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Adjustment Panel */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 10,
        padding: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '8px',
        color: 'white',
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
        maxWidth: '300px'
      }}>
        {/* Dropdown for colormap selection */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="colormap-select" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Select Colormap:</label>
          <select
            id="colormap-select"
            value={colormap}
            onChange={(e) => setColormap(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#222',
              color: 'white'
            }}
          >
            {colormaps.map((cmap) => (
              <option key={cmap} value={cmap}>{cmap}</option>
            ))}
          </select>
        </div>
  
        {/* Dropdown for property selection */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="property-select" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Select Property:</label>
          <select
            id="property-select"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#222',
              color: 'white'
            }}
          >
            {visualizedProperties.map((property) => (
              <option key={property} value={property}>{property}</option>
            ))}
          </select>
        </div>
  
        {/* Dropdown for data name selection */}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="data-select" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Select Data:</label>
          <select
            id="data-select"
            value={dataName}
            onChange={(e) => setDataName(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #ccc',
              backgroundColor: '#222',
              color: 'white'
            }}
          >
            {dataNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
  
        {/* Slider for Clipping Distance X*/}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="clipping-slider" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Clipping Distance X: {clippingDistanceX}</label>
          <input
            type="range"
            id="clipping-slider"
            min="-100"
            max="100"
            step="1"
            value={clippingDistanceX}
            onChange={(e) => setClippingDistanceX(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Slider for Clipping Distance Y*/}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="clipping-slider" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Clipping Distance Y: {clippingDistanceY}</label>
          <input
            type="range"
            id="clipping-slider"
            min="-100"
            max="100"
            step="1"
            value={clippingDistanceY}
            onChange={(e) => setClippingDistanceY(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        {/* Slider for Clipping Distance Z*/}
        <div style={{ marginBottom: '15px' }}>
          <label htmlFor="clipping-slider" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Clipping Distance Z: {clippingDistanceZ}</label>
          <input
            type="range"
            id="clipping-slider"
            min="-100"
            max="100"
            step="1"
            value={clippingDistanceZ}
            onChange={(e) => setClippingDistanceZ(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
  
        {/* Slider for Point Size */}
        <div>
          <label htmlFor="point-size-slider" style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Point Size: {pointSizeDisplay}</label>
          <input
            type="range"
            id="point-size-slider"
            min="0.1"
            max="3"
            step="0.1"
            value={pointSizeDisplay}
            onChange={handlePointSizeChange}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Minimum density label */}
          {minValue !== null && <span style={{ color: 'white' }}>{minValue.toFixed(2)}</span>}
          
          {/* Colorbar canvas */}
          <canvas
            ref={colorbarRef}
            width={400}
            height={20}
            style={{ border: '1px solid black' }}
          ></canvas>
          
          {/* Maximum density label */}
          {maxValue !== null && <span style={{ color: 'white' }}>{maxValue.toFixed(2)}</span>}
        </div>
        <p style={{ marginTop: '5px', color: 'white' }}>{explanationText}</p>
      </div>
    </div>
  );
  
};

export default PointCloudAndGaussianVisualizer;

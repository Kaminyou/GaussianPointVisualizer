// import React, { useState, useEffect, useRef } from 'react';
// import axios from 'axios';

// function App() {
//   const [image, setImage] = useState(null);
//   const [points, setPoints] = useState(null);
//   const [allPoints, setAllPoints] = useState(null);
//   const [allIntensities, setAllIntensities] = useState(null);
//   const [threshold, setThreshold] = useState(128); // Default threshold

//   const [redCount, setRedCount] = useState(0); // Count of red points
//   const [blueCount, setBlueCount] = useState(0); // Count of blue points
//   const [pointSize, setPointSize] = useState(5);
//   const [showPoints, setShowPoints] = useState(true);

//   const [imageNames, setImageNames] = useState([]);
//   const [selectedImageName, setSelectedImageName] = useState('');

//   const canvasRef = useRef(null);

//   useEffect(() => {
//     // Fetch available image names from the API
//     axios.get('/api/get_image_names')
//       .then((response) => {
//         setImageNames(response.data.images);
//       })
//       .catch((error) => {
//         console.error('Error fetching image names:', error);
//       });
//   }, []);

//   useEffect(() => {
//     // Replace with your Flask API endpoints
//     const imageApiUrl = `/api/get_image?name=${selectedImageName}`;
//     const pointsApiUrl = `/api/get_points?name=${selectedImageName}`;

//     axios.get(imageApiUrl, { responseType: 'blob' }).then((response) => {
//       // Create a Blob from the response data
//       const blob = new Blob([response.data], { type: 'image/jpeg' });
//       // Create a URL for the Blob
//       const imageUrl = URL.createObjectURL(blob);
//       setImage(imageUrl);
//     });

//     axios.get(pointsApiUrl).then((response) => {
//       const { points: points, intensities: intensities } = response.data;
//       setAllPoints(points)
//       setAllIntensities(intensities)
//       const redPoints = [];
//       const bluePoints = [];

//       points.forEach((point, index) => {
//         if (intensities[index] < threshold) {
//           redPoints.push(point);
//         } else {
//           bluePoints.push(point);
//         }
//       });
//       setPoints({ red: redPoints, blue: bluePoints });
//       setRedCount(redPoints.length); // Set the count of red points
//       setBlueCount(bluePoints.length); // Set the count of blue points
//     });
//   }, [selectedImageName]);

//   useEffect(() => {
//     if (image && points) {
//       const redPoints = [];
//       const bluePoints = [];

//       allPoints.forEach((point, index) => {
//         if (allIntensities[index] < threshold) {
//           redPoints.push(point);
//         } else {
//           bluePoints.push(point);
//         }
//       });
//       setPoints({ red: redPoints, blue: bluePoints });
//       setRedCount(redPoints.length); // Set the count of red points
//       setBlueCount(bluePoints.length); // Set the count of blue points
//     }
//   }, [threshold]);

//   useEffect(() => {
//     const canvas = canvasRef.current;
//     const context = canvas.getContext('2d');
//     const size = 700
//     canvas.width = size;
//     canvas.height = size;
//     if (image && points) {
//       const imageElement = new Image();
//       imageElement.src = image;
//       imageElement.onload = () => {
//         const imageWidth = imageElement.width;
//         const imageHeight = imageElement.height;
      
//         const maxDimension = Math.max(imageWidth, imageHeight);
//         const widthRatio = size / maxDimension;
//         const heightRatio = size / maxDimension;
      
//         context.drawImage(imageElement, 0, 0, size, size);
      
//         if (showPoints) {
//           for (const color in points) {
//             context.fillStyle = color;
//             points[color].forEach((point) => {
//               context.beginPath();
//               context.arc(
//                 point[0] * widthRatio, // x-coordinate
//                 point[1] * heightRatio, // y-coordinate
//                 pointSize, // Point size
//                 0,
//                 2 * Math.PI
//               );
//               context.fill();
//             });
//           }
//         }
//       };
      
//     } else {
//       // Display "Loading..." on the canvas when image is null
//       context.clearRect(0, 0, canvas.width, canvas.height);
//       context.font = '24px Arial';
//       context.fillStyle = 'black';
//       context.textAlign = 'center';
//       context.textBaseline = 'middle';
//       context.fillText('Loading...', canvas.width / 2, canvas.height / 2);
//     }
//   }, [image, points, pointSize, showPoints]);

//   const handleImageSelect = (selectedImage) => {
//     setSelectedImageName(selectedImage);
//   };

//   return (
//     <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', padding: '20px' }}>
//     {/* Title */}
    
    
//     {/* Middle Section (Controls) */}
//     <div style={{ display: 'flex', flexDirection: 'row', flex: 1, margin: '20px 0' }}>
//       {/* Left Side (Controls) */}
//       <div style={{ flex: 1, marginRight: '20px' }}>
//       <h1 style={{ textAlign: 'center' }}>Point Viewer</h1>
//         <div>
//           <label htmlFor="imageSelect">Select Image:</label>
//           <select
//             id="imageSelect"
//             onChange={(e) => handleImageSelect(e.target.value)}
//             value={selectedImageName} // Set the selected value
//           >
//             <option value="">None</option> {/* Default option */}
//             {imageNames.map((imageName) => (
//               <option key={imageName} value={imageName}>
//                 {imageName}
//               </option>
//             ))}
//           </select>
//         </div>
//         <div>
//           <label htmlFor="threshold">Threshold: {threshold}</label>
//           <input
//             type="range"
//             id="threshold"
//             name="threshold"
//             min="0"
//             max="500"
//             value={threshold}
//             onChange={(e) => setThreshold(e.target.value)}
//             style={{ width: '100%' }}
//           />
//         </div>
//         <div>
//           <label htmlFor="pointSize">Point Size: {pointSize}</label>
//           <input
//             type="range"
//             id="pointSize"
//             name="pointSize"
//             min="1"
//             max="10" // Adjust the max value as needed
//             value={pointSize}
//             onChange={(e) => setPointSize(e.target.value)}
//             style={{ width: '100%' }}
//           />
//         </div>
//         <div>
//           <button onClick={() => setShowPoints(!showPoints)}>
//             {showPoints ? 'Hide Points' : 'Show Points'}
//           </button>
//         </div>
//       </div>
      
//       {/* Right Side (Canvas) */}
//       <div style={{ flex: 1 }}>
//         <div>
//           <p>Image: {selectedImageName} || Total: {redCount + blueCount} || Positive: {redCount} || Negative: {blueCount}</p>
//         </div>
//         <canvas
//           ref={canvasRef}
//           style={{ width: '100%', height: '100%' }}
//         ></canvas>
//       </div>
//     </div>
//   </div>
//   );
// }

// export default App;
import React from 'react';
import PointCloudVisualizer from './PointCloudVisualizer';

function App() {
  return (
    <div className="App">
      <PointCloudVisualizer />
    </div>
  );
}

export default App;
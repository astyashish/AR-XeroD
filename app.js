document.addEventListener("DOMContentLoaded", function () {
  var scene, camera, renderer, clock, deltaTime, totalTime;
  var arToolkitSource, arToolkitContext;
  var markers = {}; // Store user markers
  var userData = {}; // Store user data
  var detectedMarker = null; // Track the currently detected marker
  var infoDiv = document.getElementById("info");
  var errorDiv = document.getElementById("error");

  initialize();
  loadUserData(); // Load user data from CSV
  animate();

  function initialize() {
      // Set up the scene, camera, and renderer
      scene = new THREE.Scene();
      let ambientLight = new THREE.AmbientLight(0xcccccc, 1.0);
      scene.add(ambientLight);

      camera = new THREE.Camera();
      scene.add(camera);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setClearColor(new THREE.Color('lightgrey'), 0);
      renderer.setSize(640, 480);
      document.body.appendChild(renderer.domElement);

      clock = new THREE.Clock();
      deltaTime = 0;
      totalTime = 0;

      // Initialize AR Toolkit Source
      arToolkitSource = new THREEx.ArToolkitSource({ sourceType: 'webcam' });

      function onResize() {
          arToolkitSource.onResizeElement();
          arToolkitSource.copyElementSizeTo(renderer.domElement);
          if (arToolkitContext.arController !== null) {
              arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
          }
      }

      arToolkitSource.init(() => {
          console.log("AR Toolkit Source initialized.");
          onResize();
      }, (error) => {
          errorDiv.innerHTML = "Error initializing AR Toolkit Source: " + error.message;
          console.error("Error initializing AR Toolkit Source:", error);
      });

      window.addEventListener('resize', () => onResize());

      // Initialize AR Toolkit Context
      arToolkitContext = new THREEx.ArToolkitContext({
          cameraParametersUrl: 'data/camera_para.dat',
          detectionMode: 'mono'
      });

      arToolkitContext.init(() => {
          console.log("AR Toolkit Context initialized.");
          camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
      }, (error) => {
          errorDiv.innerHTML = "Error initializing AR Toolkit Context: " + error.message;
          console.error("Error initializing AR Toolkit Context:", error);
      });
  }

  // Load User Data from CSV
  function loadUserData() {
      fetch("data.csv")
          .then(response => response.text())
          .then(text => {
              let lines = text.split("\n").slice(1); // Skip the header line
              lines.forEach(line => {
                  let [user_id, patt_file, model_file] = line.split(",");
                  if (user_id && patt_file && model_file) {
                      userData[patt_file.trim()] = {
                          userId: user_id.trim(),
                          modelFile: model_file.trim()
                      };
                      createMarker(patt_file.trim(), model_file.trim());
                  }
              });
          })
          .catch(error => {
              errorDiv.innerHTML = "Error loading CSV: " + error.message;
              console.error("Error loading CSV:", error);
          });
  }

  // Create Marker & Assign Model
  function createMarker(pattFile, modelFile) {
      let markerRoot = new THREE.Group();
      scene.add(markerRoot);

      // Add AR Marker Controls
      new THREEx.ArMarkerControls(arToolkitContext, markerRoot, {
          type: "pattern",
          patternUrl: pattFile,
          changeCallback: (marker) => {
              if (marker.visible) {
                  detectedMarker = pattFile; // Track the detected marker
                  updateInfo(); // Update the displayed info
              }
          }
      });

      markers[pattFile] = markerRoot;
      load3DModel(modelFile, markerRoot);
  }

  // Load 3D Model for User
  function load3DModel(modelPath, markerRoot) {
      new THREE.MTLLoader()
          .setPath("models/")
          .load(modelPath.replace(".obj", ".mtl"), function (materials) {
              materials.preload();
              new THREE.OBJLoader()
                  .setMaterials(materials)
                  .setPath("models/")
                  .load(modelPath, function (group) {
                      let model = group.children[0];
                      model.material.side = THREE.DoubleSide;
                      model.position.y = 0.25;
                      model.scale.set(0.25, 0.25, 0.25);
                      markerRoot.add(model);
                  }, undefined, (error) => {
                      errorDiv.innerHTML = "Error loading 3D model: " + error.message;
                      console.error("Error loading 3D model:", error);
                  });
          }, undefined, (error) => {
              errorDiv.innerHTML = "Error loading material: " + error.message;
              console.error("Error loading material:", error);
          });
  }

  // Update AR Toolkit on every frame
  function update() {
      if (arToolkitSource.ready !== false) {
          arToolkitContext.update(arToolkitSource.domElement);
      }
  }

  // Render the scene
  function render() {
      renderer.render(scene, camera);
  }

  // Update the displayed info
  function updateInfo() {
      if (detectedMarker && userData[detectedMarker]) {
          let user = userData[detectedMarker];
          infoDiv.innerHTML = `User: ${user.userId}<br>Model: ${user.modelFile}`;
      } else {
          infoDiv.innerHTML = "No marker detected.";
      }
  }

  // Animation loop
  function animate() {
      requestAnimationFrame(animate);
      deltaTime = clock.getDelta();
      totalTime += deltaTime;

      update();
      render();
  }
});
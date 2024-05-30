const express = require('express');
const bodyParser = require('body-parser');
const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');

const app = express();
app.use(bodyParser.json());

let trainingData = [];
const DATA_FILE = 'data.json';
const MODEL_FILE = 'model.json';

// Load training data from file
function loadTrainingData() {
  if (fs.existsSync(DATA_FILE)) {
    const rawData = fs.readFileSync(DATA_FILE);
    trainingData = JSON.parse(rawData);
  }
}

// Save training data to file
function saveTrainingData() {
  const data = JSON.stringify(trainingData);
  fs.writeFileSync(DATA_FILE, data);
}

// Create and compile the model
function createModel() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [6], units: 128, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: 32, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1 }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });
  return model;
}

let model = createModel();

// Load model if exists
async function loadModel() {
  if (fs.existsSync(MODEL_FILE)) {
    model = await tf.loadLayersModel(`file://${MODEL_FILE}`);
  }
}

// Train the model
async function trainModel() {
  const inputs = trainingData.map(d => d.inputValues);
  const labels = trainingData.map(d => [d.label]);

  const inputTensor = tf.tensor2d(inputs);
  const labelTensor = tf.tensor2d(labels);

  await model.fit(inputTensor, labelTensor, {
    epochs: 50,
    validationSplit: 0.2,
    callbacks: {
      onEpochEnd: async (epoch, logs) => {
        console.log(`Epoch ${epoch + 1}: loss = ${logs.loss}, val_loss = ${logs.val_loss}`);
        await model.save(`file://${MODEL_FILE}`);
      }
    }
  });
}

// Normalize and denormalize data functions
function normalizeData(values) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  return values.map(v => (v - min) / (max - min));
}

function denormalizeData(value, originalValues) {
  const max = Math.max(...originalValues);
  const min = Math.min(...originalValues);
  return value * (max - min) + min;
}

// Handle incoming data
app.post('/data', async (req, res) => {
  const { inputValues, isCorrect } = req.body;

  const normalizedValues = normalizeData(inputValues);
  const label = isCorrect ? 1 : 0;

  trainingData.push({ inputValues: normalizedValues, label });
  saveTrainingData();

  if (trainingData.length > 10) {
    await trainModel();
  }

  res.send('Data received and model updated');
});

// Handle prediction request
app.post('/predict', async (req, res) => {
  const { inputValues } = req.body;
  const normalizedValues = normalizeData(inputValues);
  const inputTensor = tf.tensor2d([normalizedValues]);

  const prediction = await model.predict(inputTensor).dataSync();
  const predictionResult = denormalizeData(prediction[0], inputValues);

  res.json({ prediction: predictionResult });
});

// Initialize the server
app.listen(3000, () => {
  console.log('Server is running on port 3000');
  loadTrainingData();
  loadModel();
});

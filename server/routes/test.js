const express = require('express');
const Docker = require('dockerode');
const path = require('path');
const fs = require('fs').promises;
const router = express.Router();
const docker = new Docker();
const os = require('os');

router.post('/', async (req, res) => {
  const cppfilepath = path.join(__dirname, 'test1', 'a.cpp');
  const inputfilepath = path.join(__dirname, 'test1', 'input.txt');
  const outputfilepath = path.join(__dirname, 'test1', 'output.txt');
  const verdictfilepath = path.join(__dirname, 'test1', 'verdict.txt');
  const test_path = path.join(__dirname,'test1');
  const { code, input } = req.body;

  if (!code) {
    return res.status(400).send('Code is required.');
  }

  const containerOptions = {
    Image: 'nubskr/compiler:1',
    Cmd: ['./doshit.sh'],
    HostConfig: {
      Memory: 256 * 1024 * 1024, // 512MB
      PidsLimit: 100, // Limit number of processes
      Binds: [
        `${test_path}/:/contest/`,
      ],            
      NetworkMode: 'none',
    }
  };

  async function changeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, data, 'utf8');
      console.log(`File content at ${filePath} has been updated.`);
    } catch (err) {
      console.error('Error writing the file:', err);
      throw err;
    }
  }

  async function runContainer() {
    try {
      const container = await docker.createContainer(containerOptions);

      await container.start();
      console.log('Container started successfully.');

      // Waiting for the container to stop after running the script
      await container.stop();
      console.log('Container stopped.');

      // Reading the verdict file to determine the result
      const verdict = await fs.readFile(verdictfilepath, 'utf8');
      const outputData = await fs.readFile(outputfilepath, 'utf8');
      console.log(verdict);
      if (verdict.includes('Compilation Error')) {
        return res.status(400).send({ error: 'Compilation Error' });
      } else if (verdict.includes('Time Limit Exceeded')) {
        return res.status(400).send({ error: 'Time Limit Exceeded' });
      } else if (verdict.includes('Runtime Error')) {
        return res.status(400).send({ error: 'Runtime Error' });
      } else if (verdict.includes('Wrong Answer')) {
        return res.status(400).send({ error: 'Wrong Answer', output: outputData });
      } else if (verdict.includes('Accepted')) {
        return res.send({ message: 'Accepted', output: outputData });
      } else {
        return res.status(500).send('Internal Server Error');
      }

    } catch (err) {
      console.error('Error during Docker container operation:', err);
      res.status(500).send('Internal Server Error');
    }
  }

  try {
    await changeFile(cppfilepath, code);
    await changeFile(inputfilepath, input);
    await runContainer();
  } catch (err) {
    res.status(500).send('An error occurred while processing your request.');
  }
});

module.exports = router;

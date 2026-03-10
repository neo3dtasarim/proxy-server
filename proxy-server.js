const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Python fetch proxy
app.post('/api/python-fetch', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body = null } = req.body;
    const response = await axios({ method, url, headers, data: body, timeout: 10000 });
    res.json({ status: 200, text: response.data, headers: response.headers });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// PHP
app.post('/api/run/php', (req, res) => {
  const { code } = req.body;
  const tmpFile = path.join(__dirname, `temp_${Date.now()}.php`);
  fs.writeFileSync(tmpFile, code);
  exec(`php "${tmpFile}"`, { timeout: 5000 }, (err, stdout, stderr) => {
    fs.unlinkSync(tmpFile);
    res.json({ status: err ? 'error' : 'success', output: err ? stderr : stdout });
  });
});

// Java
app.post('/api/run/java', (req, res) => {
  const { code } = req.body;
  const className = code.match(/public\s+class\s+(\w+)/)?.[1] || 'Main';
  const javaFile = path.join(__dirname, `${className}.java`);
  fs.writeFileSync(javaFile, code);
  exec(`javac "${javaFile}"`, { timeout: 5000 }, (compileErr) => {
    if (compileErr) {
      fs.unlinkSync(javaFile);
      return res.json({ status: 'error', output: compileErr.message });
    }
    exec(`java -cp "${path.dirname(javaFile)}" ${className}`, { timeout: 5000 }, (runErr, stdout, stderr) => {
      try { fs.unlinkSync(javaFile); } catch (e) {}
      try { fs.unlinkSync(path.join(__dirname, `${className}.class`)); } catch (e) {}
      res.json({ status: runErr ? 'error' : 'success', output: runErr ? stderr : stdout });
    });
  });
});

// C++
app.post('/api/run/cpp', (req, res) => {
  const { code } = req.body;
  const cppFile = path.join(__dirname, `temp_${Date.now()}.cpp`);
  const exeFile = path.join(__dirname, `temp_${Date.now()}${process.platform === 'win32' ? '.exe' : ''}`);
  fs.writeFileSync(cppFile, code);
  exec(`g++ "${cppFile}" -o "${exeFile}"`, { timeout: 10000 }, (compileErr) => {
    if (compileErr) {
      fs.unlinkSync(cppFile);
      return res.json({ status: 'error', output: compileErr.message });
    }
    exec(`"${exeFile}"`, { timeout: 5000 }, (runErr, stdout, stderr) => {
      try { fs.unlinkSync(cppFile); } catch (e) {}
      try { fs.unlinkSync(exeFile); } catch (e) {}
      res.json({ status: runErr ? 'error' : 'success', output: runErr ? stderr : stdout });
    });
  });
});

// C#
app.post('/api/run/csharp', (req, res) => {
  const { code } = req.body;
  const csFile = path.join(__dirname, `temp_${Date.now()}.cs`);
  const exeFile = path.join(__dirname, `temp_${Date.now()}.exe`);
  fs.writeFileSync(csFile, code);
  exec(`csc "${csFile}" -out:"${exeFile}"`, { timeout: 10000 }, (compileErr) => {
    if (compileErr) {
      fs.unlinkSync(csFile);
      return res.json({ status: 'error', output: compileErr.message });
    }
    exec(`"${exeFile}"`, { timeout: 5000 }, (runErr, stdout, stderr) => {
      try { fs.unlinkSync(csFile); } catch (e) {}
      try { fs.unlinkSync(exeFile); } catch (e) {}
      res.json({ status: runErr ? 'error' : 'success', output: runErr ? stderr : stdout });
    });
  });
});

// Node.js
app.post('/api/run/node', (req, res) => {
  const { code } = req.body;
  const jsFile = path.join(__dirname, `temp_${Date.now()}.js`);
  fs.writeFileSync(jsFile, code);
  exec(`node "${jsFile}"`, { timeout: 5000 }, (err, stdout, stderr) => {
    fs.unlinkSync(jsFile);
    res.json({ status: err ? 'error' : 'success', output: err ? stderr : stdout });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Proxy sunucusu çalışıyor. Port: ${PORT}`);
});
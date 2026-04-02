const http = require('http');

const testApi = async () => {
  console.log("Starting test...");

  const loginReq = http.request('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, (res) => {
    let raw = '';
    res.on('data', chunk => raw += chunk);
    res.on('end', () => {
      console.log('Login Response:', res.statusCode, raw);
      const token = JSON.parse(raw).token;

      if (!token) return console.error('No token received');

      const roomData = JSON.stringify({
        number: "ROOM-TEST-" + Date.now(),
        type: "Single",
        price: 5000,
        amenities: "WiFi"
      });

      const roomReq = http.request('http://localhost:5000/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
          'Content-Length': Buffer.byteLength(roomData)
        }
      }, (roomRes) => {
        let roomRaw = '';
        roomRes.on('data', chunk => roomRaw += chunk);
        roomRes.on('end', () => {
          console.log('Room Create Response:', roomRes.statusCode, roomRaw);
        });
      });

      roomReq.write(roomData);
      roomReq.end();
    });
  });

  loginReq.write(JSON.stringify({ username: 'admin', password: 'admin123' }));
  loginReq.end();
};

testApi();

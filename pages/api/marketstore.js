const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
    const filePath = path.join(process.cwd(), './pages/api/marketstoreData.json');
  
    try {
      if (req.method === 'GET') {
        const data = fs.existsSync(filePath)
          ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
          : [];
        res.status(200).json(data);
      } else if (req.method === 'POST') {
        const { address } = req.body;
        if (!address) return res.status(400).json({ message: 'Address is required' });
  
        const data = fs.existsSync(filePath)
          ? JSON.parse(fs.readFileSync(filePath, 'utf8'))
          : [];
  
        if (!data.includes(address)) {
          data.push(address);
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
        }
        res.status(200).json({ message: 'Address added', data });
      } else {
        res.status(405).json({ message: 'Method not allowed' });
      }
    } catch (error) {
      res.status(500).json({ message: 'Internal Server Error' });
    }
  }
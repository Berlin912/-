const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const db = new sqlite3.Database('./mydatabase.db');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS training_data (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        input1 REAL,
        input2 REAL,
        input3 REAL,
        input4 REAL,
        input5 REAL,
        input6 REAL,
        label INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

app.post('/data', (req, res) => {
    const { input1, input2, input3, input4, input5, input6, label } = req.body;
    db.run(`INSERT INTO training_data (input1, input2, input3, input4, input5, input6, label) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [input1, input2, input3, input4, input5, input6, label],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID });
        }
    );
});

app.delete('/data', (req, res) => {
    db.run(`DELETE FROM training_data WHERE timestamp <= datetime('now', '-1 day')`,
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Old data deleted' });
        }
    );
});

app.get('/data', (req, res) => {
    db.all(`SELECT * FROM training_data`, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ data: rows });
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

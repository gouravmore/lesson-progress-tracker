const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3007;

// Create a MySQL database connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
  });

app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,PATCH,DELETE,OPTIONS')
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization,' + 'cid, user-id, x-auth, Cache-Control, X-Requested-With, datatype, *')
    if (req.method === 'OPTIONS') res.sendStatus(200)
    else next()
});

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    return;
  }
  console.log('Connected to MySQL');
});

app.use(express.json());

app.get('/lessons/:studentId', (req, res) => {
  const studentId = req.params.studentId;

  // Query the database to retrieve all lessons for the specified student ID
  db.query('SELECT * FROM lesson_scores WHERE student_id = ?', [studentId], (err, results) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(results);
  });
});


// Get cumulative score for student by student ID
app.get('/student/:studentId', (req, res) => {
    const studentId = req.params.studentId;

    // Query the database to retrieve the cumulative score for the specified student ID
    db.query('SELECT SUM(score) AS totalScore FROM lesson_scores WHERE student_id = ?', [studentId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (results.length === 0 || results[0].totalScore === null) {
            res.status(404).json({ error: 'Student not found or no scores available' });
            return;
        }

        const totalScore = results[0].totalScore;

        res.json({ studentId, totalScore });
    });
});

// Get score for lesson by lesson ID
app.get('/lesson/:lessonId', (req, res) => {
    const lessonId = req.params.lessonId;

    // Query the database to retrieve the score for the specified lesson ID
    db.query('SELECT score FROM lesson_scores WHERE lesson_id = ?', [lessonId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (results.length === 0) {
            res.status(404).json({ error: 'Lesson not found' });
            return;
        }

        const score = results[0].score; // Assuming there is only one score for the lesson

        res.json({ lessonId, score });
    });
});
  
app.post('/:studentId/:lessonId', (req, res) => {
    const { studentId, lessonId } = req.params;
    const { score } = req.body;

    // Check if a score entry already exists for the student and lesson
    db.query('SELECT * FROM lesson_scores WHERE student_id = ? AND lesson_id = ?', [studentId, lessonId], (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        if (results.length === 0) {
            // If no entry exists, create a new score entry with the provided score
            const insertQuery = `
                INSERT INTO lesson_scores (student_id, lesson_id, score, date_completed)
                VALUES (?, ?, ?, NOW())
            `;
            db.query(insertQuery, [studentId, lessonId, score], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'New score entry created successfully' });
            });
        } else {
            // If an entry exists, update the existing score by adding the provided score
            const existingScore = results[0].score;
            const newScore = existingScore + score;
            const updateQuery = 'UPDATE lesson_scores SET score = ? WHERE student_id = ? AND lesson_id = ?';
            db.query(updateQuery, [newScore, studentId, lessonId], (err) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                res.json({ message: 'Score updated successfully' });
            });
        }
    });
});

 

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

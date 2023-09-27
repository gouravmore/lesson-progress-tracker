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
        throw err; // Terminate the application if the database connection fails
    }
    console.log('Connected to MySQL');
});

app.use(express.json());

app.get('/lessons/:studentId', (req, res) => {
  const studentId = req.params.studentId;

    try {
        // Query the database to retrieve all lessons for the specified student ID
        db.query('SELECT * FROM emis_learning_logs WHERE student_id = ?', [studentId], (err, results) => {
            if (err) {
            res.status(500).json({ error: err.message });
            return;
            }
            res.json(results);
        });
    } catch (err) {
        console.error('Error in /:studentId/:lessonId', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


// Get cumulative score for student by student ID
app.get('/student/:studentId', (req, res) => {
    const studentId = req.params.studentId;
    try {
        // Query the database to retrieve the cumulative score for the specified student ID
        db.query('SELECT SUM(score) AS totalScore FROM emis_learning_logs WHERE student_id = ?', [studentId], (err, results) => {
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
    } catch (err) {
        console.error('Error in /:studentId/:lessonId', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});

// Get score for lesson by lesson ID
app.get('/lesson/:lessonId', (req, res) => {
    const lessonId = req.params.lessonId;

    try {
        // Query the database to retrieve the score for the specified lesson ID
        db.query('SELECT score FROM emis_learning_logs WHERE lesson_id = ?', [lessonId], (err, results) => {
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
    } catch (err) {
        console.error('Error in /:studentId/:lessonId', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});
  
app.post('/:studentId/:lessonId', (req, res) => {
    const { studentId, lessonId } = req.params;
    const { score, sessionId } = req.body;
    try {
        // Check if a score entry already exists for the student, lesson, and session
        db.query('SELECT * FROM emis_learning_logs WHERE student_id = ? AND lesson_id = ?', [studentId, lessonId], (err, results) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            if (results.length === 0) {
                // If no entry exists, create a new score entry
                const insertQuery = `
                    INSERT INTO emis_learning_logs (student_id, lesson_id, score, date_completed)
                    VALUES (?, ?, ?, NOW())
                `;
                db.query(insertQuery, [studentId, lessonId, score, sessionId], (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ message: 'New score entry created successfully' });
                });
            } else {
                // If an entry exists, update the existing score
                const updateQuery = 'UPDATE emis_learning_logs SET score = ? WHERE student_id = ? AND lesson_id = ?';
                db.query(updateQuery, [score, studentId, lessonId, sessionId], (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ message: 'Score updated successfully' });
                });
            }
        });
    } catch (err) {
        console.error('Error in /:studentId/:lessonId', err);
        res.status(500).json({ error: 'Something went wrong' });
    }
});


app.use((err, req, res, next) => {
  console.error('Uncaught error:', err);
  res.status(500).json({ error: 'Something went wrong' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

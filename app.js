import express from 'express';
import multer from 'multer';
import { PORT, PATH_TO_API } from './config.js';
import methods from './methods/index.js';

const app = express();
const upload = multer();

app.use(upload.none());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(PATH_TO_API, methods);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
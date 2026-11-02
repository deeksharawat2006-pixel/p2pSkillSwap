import jwt from 'jsonwebtoken';
import Student from '../models/Student.js';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const student = await Student.findById(decoded.id).select('-password');
    if (!student || !student.isActive) {
      return res.status(401).json({ message: 'Token invalid or user inactive' });
    }

    req.user = student;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

export default auth;
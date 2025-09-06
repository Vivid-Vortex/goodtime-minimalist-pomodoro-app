// Validation middleware for API requests

// Validate session data
export const validateSession = (req, res, next) => {
  const { id, duration, label, is_break } = req.body;

  const errors = [];

  if (!id || typeof id !== 'string' || id.trim() === '') {
    errors.push('Valid session ID is required');
  }

  if (duration === undefined || typeof duration !== 'number' || duration < 0) {
    errors.push('Valid duration (number >= 0) is required');
  }

  if (!label || typeof label !== 'string' || label.trim() === '') {
    errors.push('Valid label is required');
  }

  if (is_break === undefined || typeof is_break !== 'boolean') {
    errors.push('is_break must be a boolean');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validate label data
export const validateLabel = (req, res, next) => {
  const { id, title, color, orderIndex } = req.body;

  const errors = [];

  if (!id || typeof id !== 'string' || id.trim() === '') {
    errors.push('Valid label ID is required');
  }

  if (!title || typeof title !== 'string' || title.trim() === '') {
    errors.push('Valid title is required');
  }

  if (color === undefined || typeof color !== 'number' || color < 0) {
    errors.push('Valid color (number >= 0) is required');
  }

  if (orderIndex === undefined || typeof orderIndex !== 'number') {
    errors.push('Valid orderIndex (number) is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validate timer profile data
export const validateTimerProfile = (req, res, next) => {
  const { 
    name, 
    workDuration, 
    breakDuration, 
    longBreakDuration, 
    sessionsBeforeLongBreak,
    workBreakRatio 
  } = req.body;

  const errors = [];

  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.push('Valid profile name is required');
  }

  if (workDuration === undefined || typeof workDuration !== 'number' || workDuration <= 0) {
    errors.push('Valid workDuration (number > 0) is required');
  }

  if (breakDuration === undefined || typeof breakDuration !== 'number' || breakDuration <= 0) {
    errors.push('Valid breakDuration (number > 0) is required');
  }

  if (longBreakDuration === undefined || typeof longBreakDuration !== 'number' || longBreakDuration <= 0) {
    errors.push('Valid longBreakDuration (number > 0) is required');
  }

  if (sessionsBeforeLongBreak === undefined || typeof sessionsBeforeLongBreak !== 'number' || sessionsBeforeLongBreak <= 0) {
    errors.push('Valid sessionsBeforeLongBreak (number > 0) is required');
  }

  if (workBreakRatio === undefined || typeof workBreakRatio !== 'number' || workBreakRatio <= 0) {
    errors.push('Valid workBreakRatio (number > 0) is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  next();
};

// Validate pagination parameters
export const validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;

  if (limit !== undefined) {
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
      return res.status(400).json({
        error: 'Invalid limit parameter (must be 1-1000)'
      });
    }
  }

  if (offset !== undefined) {
    const offsetNum = parseInt(offset);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        error: 'Invalid offset parameter (must be >= 0)'
      });
    }
  }

  next();
};
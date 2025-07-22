export const getStoredUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const storeUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const getStoredToken = () => {
  return localStorage.getItem('token');
};

export const storeToken = (token) => {
  localStorage.setItem('token', token);
};

export const isAuthenticated = () => {
  return !!getStoredToken();
};

export const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
};


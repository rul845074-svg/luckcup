import { create } from 'zustand';

const useAuthStore = create((set) => ({
  token: localStorage.getItem('lc_token') || null,
  user: null,
  shop: null,

  setAuth: (token, refreshToken, user, shop) => {
    localStorage.setItem('lc_token', token);
    localStorage.setItem('lc_refresh_token', refreshToken);
    set({ token, user, shop });
  },

  clearAuth: () => {
    localStorage.removeItem('lc_token');
    localStorage.removeItem('lc_refresh_token');
    set({ token: null, user: null, shop: null });
  },

  isLoggedIn: () => !!localStorage.getItem('lc_token'),
}));

export default useAuthStore;

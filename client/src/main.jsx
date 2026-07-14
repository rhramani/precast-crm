import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/store';
import AppInitializer from './app/AppInitializer';
import AppRouter from './app/AppRouter';

// Design system — tokens first, then global reset
import './styles/tokens.css';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <AppInitializer>
          <AppRouter />
        </AppInitializer>
      </BrowserRouter>
    </Provider>
  </React.StrictMode>
);

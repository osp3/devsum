import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import UserHeader from './components/UserHeader.jsx';
import Login from './components/Login.jsx';
import Dashboard from './components/Dashboard.jsx';
import RepoListing from './components/RepoListing.jsx';
import RepoAnalytics from './components/RepoAnalytics';

function App() {
  return (
    <div>
      <UserHeader />
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path='/dashboard' element={<Dashboard />} />
        <Route path='/repositories' element={<RepoListing />} />
        <Route path='/repository' element={<RepoAnalytics />} />
      </Routes>
    </div>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './Dashboard'; 
import ComicDetail from './ComicDetail'; // <--- 1. 記得引入

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* 2. 新增這行：當網址是 /comic/數字 時，顯示 ComicDetail */}
        <Route path="/comic/:id" element={<ComicDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
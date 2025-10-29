import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import TodoList from './components/Todo/TodoList';

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<TodoList />} />
            </Routes>
        </Router>
    );
};

export default App;

import Login from "./components/Login";
import Signup from "./components/Signup";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Home from "./components/Home";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { auth } from "./firebase";
import './App.css';
import Loader from "./components/Loader";
const App = () => {
    const [userd, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // Add loading state

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
            setUser(user);
            setLoading(false); // Set loading to false once we have the auth state
        });

        // Cleanup subscription
        return () => unsubscribe();
    }, []);

    // Don't render routes until we've checked auth state
    if (loading) {
        return Loader; // Or a proper loading spinner
    }

    return (
        <BrowserRouter>
            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />
            <Routes>
                {/* Public Routes */}
                <Route 
                    path="/login" 
                    element={userd ? <Navigate to="/home" /> : <Login />} 
                />
                <Route 
                    path="/signup" 
                    element={userd ? <Navigate to="/home" /> : <Signup />} 
                />

                {/* Protected Routes */}
                <Route
                    path="/home"
                    element={userd ? <Home /> : <Navigate to="/login" />}
                />

                {/* Root route */}
                <Route 
                    path="/" 
                    element={userd ? <Navigate to="/home" /> : <Navigate to="/login" />} 
                />

                {/* 404 Route */}
                <Route 
                    path="*" 
                    element={<Navigate to={userd ? "/home" : "/login"} replace />} 
                />
            </Routes>
        </BrowserRouter>
    )
}

export default App;
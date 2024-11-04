import React, { useEffect, useState } from "react";
import { auth } from "../firebase";
import Loader from "./Loader";
import '../styles/recent.css';
import { getFirestore, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

function Recent() {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loader, setLoader] = useState(true);
    const [hoveredItem, setHoveredItem] = useState(null);
    useEffect(() => {
        // Listen for auth state changes
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                // Setup real-time listener for uploads
                const db = getFirestore();
                const userUploadsRef = collection(db, 'users', user.uid, 'uploads');
                
                const q = query(
                    userUploadsRef,
                    orderBy('uploadDate', 'desc'),
                    limit(10)
                );

                // Create real-time listener
                const unsubscribeSnapshot = onSnapshot(q, 
                    (querySnapshot) => {
                        const uploads = querySnapshot.docs.map(doc => ({
                            id: doc.id,
                            ...doc.data()
                        }));
                        setData(uploads);
                        setLoader(false);
                        console.log("Real-time updates:", uploads);
                    },
                    (err) => {
                        setError(err);
                        console.error("Error fetching data:", err);
                        setLoader(false);
                    }
                );

                // Cleanup function will run when component unmounts
                return () => {
                    unsubscribeSnapshot();
                };
            } else {
                setError(new Error('Please login first'));
                setLoader(false);
            }
        });

        // Cleanup auth listener
        return () => unsubscribe();
    }, []); // Empty dependency array as we want this to run once on mount
    function formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
    
        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(secs).padStart(2, '0');
    
        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    }
    return (
        <div className="history-container">
            <div className="history-title">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-clock-history" viewBox="0 0 16 16">
                    <path d="M8.515 1.019A7 7 0 0 0 8 1V0a8 8 0 0 1 .589.022zm2.004.45a7 7 0 0 0-.985-.299l.219-.976q.576.129 1.126.342zm1.37.71a7 7 0 0 0-.439-.27l.493-.87a8 8 0 0 1 .979.654l-.615.789a7 7 0 0 0-.418-.302zm1.834 1.79a7 7 0 0 0-.653-.796l.724-.69q.406.429.747.91zm.744 1.352a7 7 0 0 0-.214-.468l.893-.45a8 8 0 0 1 .45 1.088l-.95.313a7 7 0 0 0-.179-.483m.53 2.507a7 7 0 0 0-.1-1.025l.985-.17q.1.58.116 1.17zm-.131 1.538q.05-.254.081-.51l.993.123a8 8 0 0 1-.23 1.155l-.964-.267q.069-.247.12-.501m-.952 2.379q.276-.436.486-.908l.914.405q-.24.54-.555 1.038zm-.964 1.205q.183-.183.35-.378l.758.653a8 8 0 0 1-.401.432z" />
                    <path d="M8 1a7 7 0 1 0 4.95 11.95l.707.707A8.001 8.001 0 1 1 8 0z" />
                    <path d="M7.5 3a.5.5 0 0 1 .5.5v5.21l3.248 1.856a.5.5 0 0 1-.496.868l-3.5-2A.5.5 0 0 1 7 9V3.5a.5.5 0 0 1 .5-.5" />
                </svg>
                <h2>Recent Upload History</h2>
            </div>
            {error && <div className="error-message">Error: {error.message}</div>}
            {loader ? (
                <div className="loading"><Loader /></div>
            ) : data && data.length > 0 ? (
                <ul className="history-list">
                    {data.map(item => (
                        <li key={item.id} 
                        className="history-item"
                        onMouseEnter={() => setHoveredItem(item.id)}
                        onMouseLeave={() => setHoveredItem(null)}
                        >
                            <div>
                                <strong>File Name:</strong> {item.responseData.VideoID}
                            </div>
                            <div>
                                <strong>Status:</strong>
                                <span className={`status ${item.responseData.Status?.toLowerCase() === 'failed' ? 'status-failed' : 'status-pass'}`}>
                                    {item.responseData.Status==='failed' ? 'Sensitive Material found':'Content Approved'}
                                </span>
                            </div>
                            <div>
                                <strong>Upload Time:</strong> {item.uploadDate?.toDate ? 
                                    new Date(item.uploadDate.toDate()).toLocaleString() : 
                                    'N/A'}
                            </div>
                            {hoveredItem === item.id && (
                                <div className="hover-details">
                                    {console.log('Hover item data:', item.responseData)}
                                    {item.responseData.ModerationTags && (
                                        <div className="moderation-tags">
                                            <strong>Moderation Tags:</strong>
                                            <div className="tags-container">
                                                {(Array.isArray(item.responseData.ModerationTags) 
                                                    ? item.responseData.ModerationTags 
                                                    : item.responseData.ModerationTags.split(',')
                                                ).map((tag, index) => (
                                                    <span key={index} className="tag">
                                                        {tag.trim()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {item.responseData.Timestamps && item.responseData.Timestamps.length > 0 && (
                                        <div className="timestamps">
                                            <strong>Timestamps:</strong>
                                            <div className="timestamps-container">
                                                {item.responseData.Timestamps.map((timestamp, index) => (
                                                    <div key={index} className="timestamp-item">
                                                        {/* <span>s: </span> */}
                                                        <span>s:{formatTime(timestamp)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <div>No uploads found</div>
            )}
        </div>
    );
}

export default Recent;
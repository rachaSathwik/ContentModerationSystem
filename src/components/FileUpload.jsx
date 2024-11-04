import React, { useState } from 'react';
import AWS from 'aws-sdk';
import '../styles/file-upload.css';
import { auth } from '../firebase';
import { toast } from 'react-toastify';
import { getFirestore, collection, addDoc} from 'firebase/firestore';


const FileCard = ({ file, onSee }) => (
    <div className="file-card">
        <div className="file-preview" onClick={onSee}>
            {file && (file.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(file)} alt="Preview" />
            ) : file.type.startsWith('video/') ? (
                <video src={URL.createObjectURL(file)} />
            ) : (
                <div className="no-preview">No preview available</div>
            ))}
        </div>
        <div className="file-info">
            <p>{file.name}</p>
            <p>{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
        </div>
    </div>
);

const FullScreen = ({ open, onClose, children }) => {
    if (!open) return null;
    
    return (
        <div className="fullscreen-overlay" onClick={onClose}>
            <div className="fullscreen-content" onClick={e => e.stopPropagation()}>
                {children}
                <button className="close-button" onClick={onClose}>×</button>
            </div>
        </div>
    );
};

const FileUploadComponent = () => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [responseData, setResponseData] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showFullScreen, setShowFullScreen] = useState(false);

    // Configure AWS SDK with IAM credentials from environment variables
    AWS.config.update({
        accessKeyId: import.meta.env.VITE_REACT_APP_AWS_ACCESS_KEY_ID,
        secretAccessKey: import.meta.env.VITE_REACT_APP_AWS_SECRET_ACCESS_KEY,
        region: import.meta.env.VITE_REACT_APP_AWS_REGION,
    });
    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];  // Get the first file from the input
        setFile(selectedFile);
        if (selectedFile) {
            setPreviewUrl(URL.createObjectURL(selectedFile));
        }
        console.log(selectedFile);
    };
    const handleSee = () => {
        setShowFullScreen(true);
    };
    const uploadFile = async () => {
        if (!file) {
            alert('Please select a file');
            return;
        }

        setUploading(true);

        try {
            const currentUser = auth.currentUser;  // Get current user
            if (!currentUser) {
                throw new Error('No user logged in');
            }
            // Log the API URL we're trying to reach
            console.log('API URL:', import.meta.env.VITE_REACT_APP_API_GATEWAY_URL);

            const s3 = new AWS.S3();
            const uploadParams = {
                Bucket: import.meta.env.VITE_REACT_APP_BUCKET_NAME,
                Key: file.name,
                Body: file,
            };

            // Upload to S3 and log success
            await s3.upload(uploadParams).promise();
            toast.success("File Uploaded Successfully!");

            // Updated API call with better error handling
            try {
                const apiResponse = await fetch(import.meta.env.VITE_REACT_APP_API_GATEWAY_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    mode: 'cors', // Changed from 'no-cors' to 'cors'
                    body: JSON.stringify({
                        fileKey: file.name,
                        userId: currentUser.uid,
                        fileName: file.name,
                        uploadDate: new Date().toISOString()
                    })
                });

                // More detailed response logging
                console.log('Response Status:', apiResponse.status);
                console.log('Response Headers:', [...apiResponse.headers.entries()]);

                if (!apiResponse.ok) {
                    const errorText = await apiResponse.text().catch(e => 'No error text available');
                    throw new Error(`API request failed: Status ${apiResponse.status}, ${errorText}`);
                }

                const responseData = await apiResponse.json();
                console.log('API Response:', responseData);
                setResponseData(responseData);
                toast.success('File uploaded and recorded successfully!');

                try {
                    const db = getFirestore();
                    const userUploadsCollection = collection(db, 'users', currentUser.uid, 'uploads');
                    await addDoc(userUploadsCollection, {
                        responseData: responseData.data,
                        uploadDate: new Date()
                    });
                    toast.success('File uploaded and data saved to database!');

                } catch (firestoreError) {
                    console.error('Firestore Error:', firestoreError);
                    toast.error('Failed to save data to database');
                }
            } catch (apiError) {
                console.error('API Error Details:', {
                    message: apiError.message,
                    stack: apiError.stack
                });
                throw new Error(`API call failed: ${apiError.message}`);
            }
        } catch (err) {
            console.error('Full Error Details:', err);
            alert('Failed to upload file: ' + err.message);
        } finally {
            setUploading(false);
        }
    };
    return (
        <div classsName="content">
            <div className="file-upload">
                <h2>Upload File to be processed</h2>
                <input
                    type="file"
                    onChange={handleFileChange}
                    className="file-inp"
                    accept="image/*,video/*"
                />
                {file && (
                    <FileCard
                        file={file}
                        onSee={handleSee}
                    />
                )}
                <button onClick={uploadFile} disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload File'}
                </button>
            </div>
            <FullScreen
                open={showFullScreen}
                onClose={() => setShowFullScreen(false)}
            >
                {file && (file.type.startsWith('image/') ? (
                    <img src={previewUrl} alt="Preview" />
                ) : file.type.startsWith('video/') ? (
                    <video src={previewUrl} controls />
                ) : null)}
            </FullScreen>
            {responseData && (
                <div className="response-container">
                    <h3>Results</h3>
                    <div className="response-details">
                        <div className="response-item">
                            <span>File Name:</span>
                            <p>{responseData.data.VideoID}</p>
                        </div>
                        <div className="response-item">
                            <span>Status:</span>
                            <p className={`status ${responseData.data.Status?.toLowerCase() === 'failed' ? 'status-failed' : 'status-pass'}`}>
                                {responseData.data.Status}
                            </p>
                        </div>

                        {responseData.data.ModerationTags && (
                            <div className="response-item">
                                <span>Moderation Tags:</span>
                                <p>{responseData.data.ModerationTags}</p>
                            </div>
                        )}
                        {responseData.data.TimeStamps && (
                            <div className="response-item">
                                <span>Moderation Tags:</span>
                                <p>{responseData.data.TimeStamps}</p>
                            </div>
                        )}
                        {responseData.data.uploadDate && (
                            <div className="response-item">
                                <span>Upload Date:</span>
                                <p>{new Date(responseData.data.UploadTime).toLocaleString()}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FileUploadComponent;




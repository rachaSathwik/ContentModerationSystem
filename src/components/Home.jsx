import React, { useEffect, useState } from "react";
import { auth, db } from "../firebase";
import { collection, addDoc, query, where, getDocs } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

import FileUploadComponent from "./FileUpload";
import Loader from "./Loader";
import History from "./History";
import '../styles/home.css';
import Recent from "./Recent";

function Profile() {
  const [loading,setLoading] = useState(true);
  const [userDetails,setUserDetails] = useState([]);

  const navigate = useNavigate();
  const fetchUserData = async () => {
    auth.onAuthStateChanged(async (user) => {
      console.log(user);
      const q = query(collection(db, "users",user.uid,"profile"), where("uid", "==", user.uid));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setUserDetails(querySnapshot.docs[0].data());
        setLoading(false);
        console.log(userDetails);
      } else {
        console.log("User is not logged in");
      }
    });
  };
  useEffect(() => {
    fetchUserData();
  }, []);

 

  async function handleLogout() {
    try {
      await auth.signOut();
      navigate('/login');
      console.log("User logged out successfully!");
    } catch (error) {
      console.error("Error logging out:", error.message);
    }
  }
  return (
    <>
      {!loading ? (
      <div>
        <div className="nav">
          {userDetails && userDetails.email ? (
            <div className="user">
              <h3>Welcome, {userDetails.email}</h3>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                width="25" 
                height="25" 
                cursor="pointer"
                fill="currentColor" 
                className="bi bi-box-arrow-right cursor-pointer" 
                viewBox="0 0 16 16"
                onClick={handleLogout}
              >
                <path fillRule="evenodd" d="M10 12.5a.5.5 0 0 1-.5.5h-8a.5.5 0 0 1-.5-.5v-9a.5.5 0 0 1 .5-.5h8a.5.5 0 0 1 .5.5v2a.5.5 0 0 0 1 0v-2A1.5 1.5 0 0 0 9.5 2h-8A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h8a1.5 1.5 0 0 0 1.5-1.5v-2a.5.5 0 0 0-1 0z"/>
                <path fillRule="evenodd" d="M15.854 8.354a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708.708L14.293 7.5H5.5a.5.5 0 0 0 0 1h8.793l-2.147 2.146a.5.5 0 0 0 .708.708z"/>
              </svg>
            </div>
          ) : (
            <h3>Login</h3>
          )}
        </div>
          <div className="content">
            <FileUploadComponent />
            {/* <History/> */}
            <Recent/>
          </div>
      </div>):
      (
        <div className="center-loader">
        <Loader />
      </div>
      )}
    </>
  );
}
export default Profile;
import { createUserWithEmailAndPassword } from "firebase/auth";
import { toast } from 'react-toastify';
import { useState } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { auth,db } from "../firebase";
import { useNavigate } from "react-router-dom";
import {  collection, setDoc ,addDoc} from "firebase/firestore";
import '../styles/auth.css';

const SignUp = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [hide, setHide] = useState(true);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.username || !formData.email || !formData.password || !formData.confirmPassword) {
            toast.error('Please fill in all fields');
            return;
        }
        if (formData.password.length < 6) {
            toast.error('Password should be at least 6 characters');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }
        try {
            console.log(formData.email);
            await createUserWithEmailAndPassword(auth, formData.email, formData.password);
            const user = auth.currentUser;
            
            if (user) {
                await addDoc(collection(db,"users",user.uid,'profile'),{
                    uid:user.uid,
                    email:user.email,
                    username:formData.username
                });
            }
            console.log(user);
            console.log(`User registered Successfully`);
            toast.success(`User registered Successfully`);
            navigate('/login');
        } catch (err) {
            console.log(err.message);
            toast.success(err.message);
        }
    }
    const handleChange = (e) => {

        const { name, value } = e.target;
        setFormData(prevData => ({
            ...prevData,
            [name]: value
        }));
    };
    return (
        <div className="login-box">
            <div className="login-form">
                <form onSubmit={handleSubmit}>
                    <label>
                        Username:
                        <input
                            type="text"
                            name="username"
                            className="auth-inp"
                            placeholder="Enter username"
                            value={formData.username}
                            onChange={handleChange}
                        />
                    </label><br />
                    <label>
                        Email:
                        <input
                            type="email"
                            name="email"
                            className="auth-inp"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={handleChange}
                        />
                    </label><br />
                    <label>
                        Password:
                        <input
                            name="password"
                            type={hide ? "password" : "text"}
                            className="auth-inp"
                            placeholder="Enter Password"
                            value={formData.password}
                            onChange={handleChange}
                        />
                    </label>
                    {hide ? (
                        <AiOutlineEyeInvisible
                            onClick={() => setHide(!hide)}
                            style={{ cursor: 'pointer', marginLeft: '5px', fontSize: '20px' }}
                        />
                    ) : (
                        <AiOutlineEye
                            onClick={() => setHide(!hide)}
                            style={{ cursor: 'pointer', marginLeft: '5px', fontSize: '20px' }}
                        />
                    )}<br />
                    <label>
                        Repeat Password:
                        <input
                            name="confirmPassword"
                            type="password"
                            className="auth-inp"
                            placeholder="Enter Password again"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                        />
                    </label><br />
                    <button className="auth-btn" type="submit">Submit</button><br />
                    <a href="/login">If already registered, Login</a>
                </form>
            </div>
        </div>
    )
}
export default SignUp;
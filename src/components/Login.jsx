import { useEffect, useState } from "react";
import "../styles/auth.css";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [hide,setHide] = useState(true);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try{
      await signInWithEmailAndPassword(auth,email,password);
      console.log(`Logged in Successfully`);
      toast.success(`Logged in Successfully`);
      navigate('/home');
    }catch(err){
      toast.error(err.message);
    }
  }

  return (
    <div className="login-box">
      <div className="login-form">
        <form onSubmit={handleSubmit}>
          <label>
            Email:
            <input
              type="email"
              className="auth-inp"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label><br/>
          <div className="pwd-inp">
            <label className="inp">
              Password:
              <input
                type={hide?"password":"text"}
                placeholder="Enter your Password"
                className="auth-inp"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {hide ? (
                <AiOutlineEyeInvisible
                  onClick={() => setHide(!hide)}
                  style={{ cursor: 'pointer', marginLeft: '5px', fontSize: '20px' }}
                  className="visible-btn"
                />
              ) : (
                <AiOutlineEye
                  onClick={() => setHide(!hide)}
                  style={{ cursor: 'pointer', marginLeft: '5px', fontSize: '20px' }}
                  className="visible-btn"
                />
              )}
            </label>
          </div>
          <button className="auth-btn" type="submit">Submit</button><br/>
          <a href="/signup">Sign Up to Register</a>
        </form>
      </div>
    </div>
  );
};
export default Login;

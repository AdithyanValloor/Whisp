import { useState } from "react"
import Login from "./Login"
import Signup from "./Signup"

function Auth() {
  
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div>
      <div className="flex justify-center items-center h-screen bg-gradient-to-r from-gray-700 to-zinc-900">
         <div className="bg-neutral-900 rounded-4xl shadow-2xl w-[500px] py-10 flex justify-center flex-col">
          { isLogin? <Login/>:<Signup/>}
          
          <div className="mt-10 text-center text-sm/6 text-gray-400 flex justify-center space-x-2">
            <p className="">
              { isLogin? `New to Whisp?`: `Already a whisperer?` }
            </p> 
            <button onClick={() => setIsLogin(prev => !prev)} type="button" className="font-semibold cursor-pointer text-indigo-400 hover:text-indigo-300">
              {isLogin? "Register" : "Log in"}
            </button>
          </div>
         </div>
      </div>
    </div>
  )
}

export default Auth

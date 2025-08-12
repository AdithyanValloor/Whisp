import { useState } from "react"
import { Eye, EyeClosed } from "lucide-react"



function Signup() {

  const [password, setPassword] = useState("")
  const [contact, setContact] = useState("")
  const [userName, setUserName] = useState("")
  const [inputType, setInputType] = useState("")
  const [dob, setDob] = useState("")

  const [showPass, setShowPass] = useState(false)

  const handleContact = (value: string) => {
    setContact(value);

    const cleanValue = value.trim();

    if (/^\+?\d+$/.test(cleanValue)) {
      setInputType("tel");
    } else {
      setInputType("email");
    }
  }


  return (
    <div>
       
            {/* MAIN BOX */}
      
            <div className="flex min-h-full flex-col justify-center px-10  lg:px-8">
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-white">Create an account</h2>
              </div>

              <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                <form action="#" method="POST" className="space-y-5">
                  <div>
                    <label htmlFor="username" className="block text-sm/6 font-medium text-gray-100">
                      USERNAME
                    </label>
                    <div className="mt-2">
                      <input
                        id="username"
                        name="username"
                        type="text"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value.toLowerCase())}
                        required
                        autoComplete="username"
                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 transition-all duration-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="contact" className="block text-sm/6 font-medium text-gray-100">
                      EMAIL
                    </label>
                    <div className="mt-2">
                      <input
                        id="contact"
                        name="contact"
                        type={inputType}
                        value={contact}
                        onChange={(e) => handleContact(e.target.value.toLowerCase())}
                        required
                        autoComplete="email"
                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 transition-all duration-300"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="dob" className="block text-sm/6 font-medium text-gray-100">
                      DATE OF BIRTH
                    </label>
                    <div className="mt-2">
                      <input
                        id="dob"
                        name="dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        required
                        autoComplete="bday"
                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label htmlFor="password" className="block text-sm/6 font-medium text-gray-100">
                        PASSWORD
                      </label>
                      <div className="text-sm">
                        <a href="#" className="font-semibold text-indigo-400 hover:text-indigo-300">
                          Forgot password?
                        </a>
                      </div>
                    </div>
                    <div className="mt-2 relative">
                      <button 
                        type="button" 
                        onMouseDown={() => setShowPass(true)}   
                        onMouseUp={() => setShowPass(false)}    
                        onMouseLeave={() => setShowPass(false)} 
                        onTouchStart={() => setShowPass(true)}  
                        onTouchEnd={() => setShowPass(false)}
                        className="absolute p-1.5 right-0 text-white opacity-50"
                      >
                        {showPass? <Eye/>:<EyeClosed/> }
                      </button>
                      <input
                        id="password"
                        name="password"
                        type={showPass? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="block w-full rounded-md bg-white/5 px-3 py-1.5 text-base text-white outline-1 -outline-offset-1 outline-white/10 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-500 sm:text-sm/6"
                      />
                    </div>
                  </div>

                  <div>
                    <button
                      type="submit"
                      className="flex w-full justify-center rounded-md bg-indigo-500 px-3 py-1.5 text-sm/6 font-semibold text-white hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
                    >
                      Create account
                    </button>
                  </div>
                </form>

                
              </div>
            </div>

       
    </div>
  )
}

export default Signup

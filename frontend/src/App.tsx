import { useState } from 'react'
import './App.css'
import Toast from './components/Toast/Toast';

function App() {
  const [showToast, setToastVisibility] = useState(true);

  return (
    <>
      <Toast type='warning' visible={showToast} onClose={() => setToastVisibility(false)}> Ada masalah saat mengupdate data </Toast>
    </>
  )
}

export default App

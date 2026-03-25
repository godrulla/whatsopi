import React from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import "./App.css"

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-primary-500 text-white p-4">
            <h1 className="text-2xl font-bold">WhatsOpí 🇩🇴</h1>
            <p className="text-sm opacity-90">Tu Colmado Digital Dominicano</p>
          </header>
          
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<HomePage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

function HomePage() {
  return (
    <div className="text-center">
      <h2 className="text-3xl font-bold text-gray-800 mb-4">
        ¡Bienvenido a WhatsOpí\! 🏪
      </h2>
      <p className="text-lg text-gray-600 mb-8">
        La plataforma digital para colmados dominicanos
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-2">🏪 Colmados Cercanos</h3>
          <p className="text-gray-600">Encuentra colmados en tu zona</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-2">🛒 Productos</h3>
          <p className="text-gray-600">Busca y compra productos</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-xl font-semibold mb-2">🎤 Comando de Voz</h3>
          <p className="text-gray-600">Habla para buscar productos</p>
        </div>
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <p className="text-blue-800">
          <strong>¡Klk\!</strong> WhatsOpí está listo para servir a la economía informal dominicana 🇩🇴
        </p>
      </div>
    </div>
  )
}

export default App

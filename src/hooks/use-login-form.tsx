'use client'

import { useState } from 'react'
import { useAuth } from '@/context/auth-context'

interface LoginForm {
  email: string
  password: string
}

export function useLoginForm() {
  const [form, setForm] = useState<LoginForm>({ email: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login(form.email, form.password)
      window.location.href = '/admin/case-studies'
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return { form, error, loading, handleSubmit, handleChange }
} 
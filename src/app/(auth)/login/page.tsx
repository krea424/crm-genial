import { LoginForm } from '@/components/shared/login-form'

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Engineering Firm OS</h1>
          <p className="text-gray-500 mt-1">Accedi al tuo account</p>
        </div>
        <LoginForm />
      </div>
    </div>
  )
}

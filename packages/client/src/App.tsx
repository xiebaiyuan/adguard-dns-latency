import { ThemeProvider } from './hooks/useTheme'
import { I18nProvider } from './lib/i18n'
import { Header } from './components/Header'
import { Dashboard } from './components/Dashboard'

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <div className="min-h-dvh flex flex-col">
          <Header />
          <main className="flex-1">
            <Dashboard />
          </main>
        </div>
      </ThemeProvider>
    </I18nProvider>
  )
}

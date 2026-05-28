import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import GuessSong from './pages/GuessSong'
import GuessSongUnlimited from './pages/GuessSongUnlimited'
import GuessMember from './pages/GuessMember'
import GuessMemberUnlimited from './pages/GuessMemberUnlimited'
import GuessLyric from './pages/GuessLyric'
import GuessLyricUnlimited from './pages/GuessLyricUnlimited'
import FanProfile from './pages/FanProfile'
import BiasQuiz from './pages/BiasQuiz'
import MemoryMatch from './pages/MemoryMatch'
import TierList from './pages/TierList'
import HigherLower from './pages/HigherLower'
import AudioGuess from './pages/AudioGuess'
import AudioGuessUnlimited from './pages/AudioGuessUnlimited'
import ArcadeDirectory from './pages/ArcadeDirectory'
import GameRouteGuard from './components/GameRouteGuard'
import AdminLayout from './components/admin/AdminLayout'
import { AdminFullRoute, AdminProtectedRoute } from './components/admin/AdminRoute'
import AdminLogin from './pages/admin/AdminLogin'
import AdminOverview from './pages/admin/AdminOverview'
import AdminBannerPage from './pages/admin/AdminBannerPage'
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage'
import AdminLeaderboardPage from './pages/admin/AdminLeaderboardPage'
import AdminGamesPage from './pages/admin/AdminGamesPage'
import AdminRequestsPage from './pages/admin/AdminRequestsPage'
import AdminBotPage from './pages/admin/AdminBotPage'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Contact from './pages/Contact'
import NotFound from './pages/NotFound'
import PlayerLink from './pages/PlayerLink'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />

        <Route element={<AdminProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="bot" element={<AdminBotPage />} />
            <Route element={<AdminFullRoute />}>
              <Route index element={<AdminOverview />} />
              <Route path="banner" element={<AdminBannerPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="leaderboard" element={<AdminLeaderboardPage />} />
              <Route path="games" element={<AdminGamesPage />} />
              <Route path="requests" element={<AdminRequestsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="link" element={<PlayerLink />} />
          <Route path="arcade" element={<ArcadeDirectory />} />
          <Route
            path="guess-song"
            element={
              <GameRouteGuard slug="guess-song">
                <GuessSong />
              </GameRouteGuard>
            }
          />
          <Route
            path="guess-song/unlimited"
            element={
              <GameRouteGuard slug="guess-song">
                <GuessSongUnlimited />
              </GameRouteGuard>
            }
          />
          <Route
            path="guess-member"
            element={
              <GameRouteGuard slug="guess-member">
                <GuessMember />
              </GameRouteGuard>
            }
          />
          <Route
            path="guess-member/unlimited"
            element={
              <GameRouteGuard slug="guess-member">
                <GuessMemberUnlimited />
              </GameRouteGuard>
            }
          />
          <Route
            path="guess-lyric"
            element={
              <GameRouteGuard slug="guess-lyric">
                <GuessLyric />
              </GameRouteGuard>
            }
          />
          <Route
            path="guess-lyric/unlimited"
            element={
              <GameRouteGuard slug="guess-lyric">
                <GuessLyricUnlimited />
              </GameRouteGuard>
            }
          />
          <Route
            path="fan-profile"
            element={
              <GameRouteGuard slug="fan-profile">
                <FanProfile />
              </GameRouteGuard>
            }
          />
          <Route
            path="bias-quiz"
            element={
              <GameRouteGuard slug="bias-quiz">
                <BiasQuiz />
              </GameRouteGuard>
            }
          />
          <Route
            path="memory-match"
            element={
              <GameRouteGuard slug="memory-match">
                <MemoryMatch />
              </GameRouteGuard>
            }
          />
          <Route
            path="tier-list"
            element={
              <GameRouteGuard slug="tier-list">
                <TierList />
              </GameRouteGuard>
            }
          />
          <Route
            path="higher-lower"
            element={
              <GameRouteGuard slug="higher-lower">
                <HigherLower />
              </GameRouteGuard>
            }
          />
          <Route
            path="audio-guess"
            element={
              <GameRouteGuard slug="audio-guess">
                <AudioGuess />
              </GameRouteGuard>
            }
          />
          <Route
            path="audio-guess/unlimited"
            element={
              <GameRouteGuard slug="audio-guess">
                <AudioGuessUnlimited />
              </GameRouteGuard>
            }
          />
          <Route path="terms" element={<Terms />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default defineNuxtRouteMiddleware(async (to) => {
  const { isAuthenticated, getSession } = useAuth()

  // Public routes (login, register, etc.) — must not depend on session fetch succeeding
  if (to.meta.auth === false) {
    return
  }

  await getSession()

  // If user is not authenticated and trying to access protected routes
  if (!isAuthenticated.value) {
    // Allow access to auth pages
    const authPages = ['/login', '/register', '/forgot-password']
    if (authPages.includes(to.path)) {
      return
    }

    // Redirect to login for all other pages
    return navigateTo('/login')
  }

  // If user is authenticated and trying to access auth pages, redirect to dashboard
  const authPages = ['/login', '/register', '/forgot-password']
  if (authPages.includes(to.path)) {
    return navigateTo('/')
  }
})

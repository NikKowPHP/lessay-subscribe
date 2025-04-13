
import Cookies from 'js-cookie'

export const getAccessToken = () => {
    return Cookies.get('sb-access-token');
};



export const setAccessToken = (accessToken: string) => {
    Cookies.set('sb-access-token', accessToken, {
        expires: 3600 / 86400, // Match Supabase session expiry (1 hour)
        secure: true,
        sameSite: 'lax'
    })
}


export const clearAccessToken = () => {
    Cookies.remove('sb-access-token');
}

import Cookies from 'js-cookie'
import logger from './logger';

export const getAccessToken = () => {
    const cookie = Cookies.get('sb-access-token');
    logger.log('cookie in getAccessToken', cookie)
    return cookie;
};


export const setAccessToken = (accessToken: string) => {
    Cookies.set('sb-access-token', accessToken, {
        expires: 3600 / 86400,
        secure: false, // Dynamic security based on environment
        sameSite: 'lax'
    })
}


export const clearAccessToken = () => {
    Cookies.remove('sb-access-token');
}


// http://web.archive.org/web/20140401031018/http://rjpower9000.wordpress.com:80/2012/04/09/fun-with-shared-libraries-version-glibc_2-14-not-found/

#if defined(__linux__) && defined(__x86_64__)
__asm__(".symver memcpy,memcpy@GLIBC_2.2.5");
#endif

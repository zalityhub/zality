isRoot()
{
  rm -f  /www/zality.com
  rm -rf /www/zality/.git
  ln -s  /www/zality/web /www/zality.com

  chmod +x $(find /www/zality -type d)
  chmod -R +r /www/zality

  cd /www/zality.com

  rm -f *.html

  ln -s views/about.hbs ./about.html
  ln -s views/contact.hbs ./contact.html
  ln -s views/index.hbs ./index.html
  # ln -s views/lookup.hbs ./lookup.html
  ln -s views/suc.hbs ./lookup.html
  ln -s views/portfolio.hbs ./portfolio.html
  ln -s public/images/favicon.ico .

  chmod -R +r /www/zality.com
}

if [ ! "$(uname -s)" = "Linux" ];then
  echo "Only on Linux"
  exit 1
fi

u="$(id|fgrep root)"
if [ "$u" != "" ];then
  isRoot
else
  cp ~/etc/telnyx.json ~/zality/web
fi

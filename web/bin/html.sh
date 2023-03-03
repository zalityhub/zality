if [ "$(uname -s)" = "Linux" ];then
  cd /www/zality/web
else
  cd ~/zality/web
fi

if [ "$1" = "put" ];then
  for f in *.html;do
    if [ -f $f ];then
      /usr/bin/mv $f views/$(basename $f .html).hbs
    fi
  done
else
  rm -f *.html
  for f in views/*.html;do
    if [ -f $f ];then
      cp -i $f $(basename $f)
    fi
  done
  for f in views/*.hbs;do
    if [ -f $f ];then
      cp -i $f $(basename $f .hbs).html
    fi
  done
fi

emit()
{
  align=$1;shift
  font=$1;shift
  color=$1;shift
  size=$1;shift
  weight=$1;shift

  margin='default'
  case $align in
	  body)
		  margin='20'
			;;
		*)
		  margin='0'
			;;
	esac

  font_family='default'
  case $font in
	  arial)
		  font_family='arial'
			;;
		rale)
		  font_family='raleway'
			;;
	esac

  cc='#ffffff'
  case $color in
	  white)
		  cc='#f1f1f1'
			;;
		green)
		  cc='#45a049'
			;;
		blue)
		  cc='#1379a1'
			;;
	esac

	cat <<EOF
.${align}_${color}_${font}${size}_${weight} {
    color: ${cc};
    text-align: ${align};
    font-family: ${font_family};
    font-size: ${size}px;
    font-weight: ${weight};
    font-style: normal;
    margin:  ${margin}px;
}
EOF
}

for align in body left center; do
  for font in arial rale;do
  	for color in white blue green;do
      for weight in 100 bold;do
    	  for size in 10 11 12 13 14 15 16 17 18 19 20 22 24 26 28 30 32 34 36 38 40 42 44 46 48;do
  	    	emit $align $font $color $size $weight
				done
	  	done
		done
	done
done

let coll = document.getElementsByClassName("collapsible");

for (let i = 0; i < coll.length; ++i) {
  function click() {
    this.classList.toggle("active");
    const content = this.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
    if(collapsibleObserver)
      collapsibleObserver(this);
  }
  coll[i].addEventListener("click", click);
}

// css
import "bootstrap-icons/font/bootstrap-icons.css";
import "../css/style.scss";

// js
import * as bootstrap from "bootstrap";
import "../aframe/index.js";  // remove later for proper GroceryStore() import
import {GroceryStore} from "../aframe";

if (document.querySelector("#view")) GroceryStore();

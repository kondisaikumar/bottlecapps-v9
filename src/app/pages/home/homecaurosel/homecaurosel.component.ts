import { Component, OnInit, Input } from '@angular/core';
import { DataService } from '../../../services/data.service';
import { Router } from '@angular/router';
import { AppConfigService } from '../../../app-config.service';
declare var jQuery: any;
import * as promotionalimages from '../../../shared/promotionImages.json';
@Component({
  selector: 'app-homecaurosel',
  templateUrl: './homecaurosel.component.html',
  styleUrls: ['./homecaurosel.component.scss']
})
export class HomecauroselComponent implements OnInit {
@Input() eventList: any;
promotionImage = [];
promotionList = [];

isShowFilters = false;
categoryFilters: any;

  constructor(private router: Router, public dataservice: DataService, public appConfigService: AppConfigService) { }

  ngOnInit() {
    if (promotionalimages && promotionalimages['promotionCarouselList']) {
      this.promotionImage = promotionalimages['promotionCarouselList'];
      const d = new Date();
      const n = d.toLocaleDateString();
this.promotionList = this.promotionImage.filter(item => new Date(item.startingdate) <= new Date && new Date(item.endDate) >= new Date(n));
console.log(this.promotionList);
    }
    jQuery('#myCarousel').carousel({
      interval: 5000,
      pause: false,
      cycle: true
 });
  }

  showFilters(categoryId) {
    this.isShowFilters = true;
    this.categoryFilters = { 'CategoryId': categoryId};
  }

  showProducts(catId, catName) {
    this.dataservice.searchByText = '';
    this.dataservice.categoryId = catId;
    this.dataservice.getFiltersByCategory();
    this.router.navigate([`/${catName}`], { queryParams: {storeid: localStorage.getItem('storeId'), cat: this.dataservice.categoryId}});
  }

  onApplyFilter() {
    this.isShowFilters = false;
  }
}

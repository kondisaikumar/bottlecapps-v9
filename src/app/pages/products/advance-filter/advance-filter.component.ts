import { Component, HostListener, OnInit, OnDestroy, Inject } from '@angular/core';
import { DataService } from '../../../services/data.service';
import { ProductFilters } from '../../../models/product-filters';
import { Item } from '../../../models/item';
import { Country } from '../../../models/country';
import { ProductType } from '../../../models/product-type';
import { Store } from '@ngrx/store';

import { ProductGetListRequestPayload } from '../../../models/product-get-list-request-payload';
import { ProductGetList } from '../../../state/product-store/product-store.action';
import { ProductStoreService } from '../../../services/product-store.service';
import { ProductStoreSelectors } from '../../../state/product-store/product-store.selector';
// import { Ng4LoadingSpinnerService } from 'ng4-loading-spinner';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ProgressBarService } from '../../../shared/services/progress-bar.service';
import { CommonService } from '../../../shared/services/common.service';
import { AppConfigService } from '../../../app-config.service';
import { SessionService } from '../../../shared/services/session.service';

@Component({
  selector: 'app-advance-filter',
  templateUrl: './advance-filter.component.html',
  styleUrls: ['./advance-filter.component.scss']
})
export class AdvanceFilterComponent implements OnInit {
  allFilterOptions: ProductFilters;
  selectedFilters: Item[] = [];
  selectedTypes: ProductType[] = [];
  selectedSizes: Item[] = [];
  selectedPrices: Item[] = [];
  selectedCountries: Country[] = [];
  allRegions: Item[] = [];
  selectedRegions: Item[] = [];
  allVarietals: Item[] = [];
  selectedVarietals: Item[] = [];
  productsList: any;
  totalProducts = 0;
  PageSize = [15, 30, 45, 60, 75, 90];
  SortBy = ['Price', 'Size', 'Type', 'Country', 'Region'];
  selectedPageSize = 15;
  navigationSubscription;
  page = 1;
  fromProductNo = 1;
  routerUrl: number;
  typeIds: any;
  varietalIds: any;
  sizeIds: any;
  countryIds: any;
  regionIds: any;
  minPrices: number;
  maxPrices: number;


  constructor(public dataservice: DataService,
    private store: Store<ProductGetListRequestPayload>,
    private productStoreService: ProductStoreService,
    // private spinnerService: Ng4LoadingSpinnerService,
    private router: Router, private route: ActivatedRoute, private appConfig: AppConfigService,
    private progressBarService: ProgressBarService, private sessionService: SessionService) {

    /* this.navigationSubscription = this.router.events.subscribe((e: any) => {
      if (e instanceof NavigationEnd) {
        this.initialiseSearchFilter();
      }
    }); */
    this.store.select(ProductStoreSelectors.productGetListData)
      .subscribe(pgld => {
        const sort = pgld ? pgld.ListProduct : [];
        this.productsList = sort.sort((x, y) => x.SortNumber < y.SortNumber ? -1 : 1);
        this.totalProducts = pgld ? pgld.TotalCount : 0;
        this.fromProductNo = ((this.page - 1) * this.selectedPageSize) + 1;
        // this.spinnerService.hide();
        this.progressBarService.hide();
      });
  }

  ngOnInit() {
    this.routerUrl = +this.route.snapshot.queryParams['cat'];
    this.dataservice.categoryId = +this.route.snapshot.queryParams['cat'];
    this.dataservice.getFiltersByCategory();
    this.productsList = [];
    this.totalProducts = 0;
    this.fromProductNo = 0;
    this.initialiseSearchFilter();
  }

  initialiseSearchFilter() {
    if (this.route.snapshot.queryParams['keyword']) {
      this.dataservice.searchByText = this.route.snapshot.queryParams['keyword'];
    } else {
      this.dataservice.searchByText = '';
    }
    if (this.dataservice.searchByText !== '') {
      this.selectedFilters = [{ id: '001', value: this.dataservice.searchByText, isSelected: true }];
      this.getProductsByKeyword();
    } else if (this.dataservice.filtersAllData) {
      this.allFilterOptions = this.dataservice.filtersAllData;
    }
      if (this.route.snapshot.queryParams['typeId']) {
        this.typeIds = this.route.snapshot.queryParams['typeId'];
        let x = [];
        x = this.typeIds.split(',').map(Number);
        for (let i = 0; i < x.length; i++) {
          const objIndex = this.allFilterOptions.type.findIndex((obj => obj.id === x[i]));
          this.allFilterOptions.type[objIndex].isSelected = true;
        }
        this.allFilterOptions.type.filter(type => type.isSelected === true).forEach(item => {
          this.allVarietals = [...this.allVarietals, ...item.varietals];
        });

        if (this.allFilterOptions.type.filter(type => type.isSelected === true).length === 0) {
          this.getAllVarietals();
        }
      } else {
        this.typeIds = '';
        this.allVarietals = this.dataservice.allVarietals;
      }
      if (this.route.snapshot.queryParams['varietalId']) {
        this.varietalIds = this.route.snapshot.queryParams['varietalId'];
        let x = [];
        x = this.varietalIds.split(',').map(Number);
        for (let i = 0; i < x.length; i++) {
          const objIndex = this.allVarietals.findIndex((obj => obj.id === x[i]));
          this.allVarietals[objIndex].isSelected = true;
        }
      } else {
        this.varietalIds = '';
      }

      if (this.route.snapshot.queryParams['sizeId']) {
        this.sizeIds = this.route.snapshot.queryParams['sizeId'];
        let x = [];
        x = this.sizeIds.split(',').map(Number);
        for (let i = 0; i < x.length; i++) {
          const objIndex = this.allFilterOptions.size.findIndex((obj => obj.id === x[i]));
          this.allFilterOptions.size[objIndex].isSelected = true;
        }
      } else {
        this.sizeIds = '';
      }


      if (this.route.snapshot.queryParams['countryId']) {
        this.countryIds = this.route.snapshot.queryParams['countryId'];
        let x = [];
        x = this.countryIds.split(',').map(Number);
        for (let i = 0; i < x.length; i++) {
          const objIndex = this.allFilterOptions.countries.findIndex((obj => obj.id === x[i]));
          this.allFilterOptions.countries[objIndex].isSelected = true;
        }
        this.allFilterOptions.countries.filter(country => country.isSelected === true).forEach(item => {
          this.allRegions = [...this.allRegions, ...item.regions];
        });

        if (this.allFilterOptions.countries.filter(country => country.isSelected === true).length === 0) {
          this.getAllRegions();
        }
      } else {
        this.countryIds = '';
        if (this.allFilterOptions && this.allFilterOptions.countries) {
          this.allRegions = this.allFilterOptions.countries.reduce((acc, item) => [...acc, ...item.regions], []);
        }
      }
      if (this.route.snapshot.queryParams['regionId']) {
        this.regionIds = this.route.snapshot.queryParams['regionId'];
        let x = [];
        x = this.regionIds.split(',').map(Number);
        for (let i = 0; i < x.length; i++) {
          const objIndex = this.allRegions.findIndex((obj => obj.id === x[i]));
          this.allRegions[objIndex].isSelected = true;
        }
      } else {
        this.regionIds = '';
      }
      if (this.route.snapshot.queryParams['maxPrice'] && this.route.snapshot.queryParams['maxPrice'] !== '0') {
        this.minPrices = +this.route.snapshot.queryParams['minPrice'];
        this.maxPrices = +this.route.snapshot.queryParams['maxPrice'];
        let x = '';
        x = '$' + this.minPrices + ' -';
        let y = '';
        y = '- ' + '$' + this.maxPrices;

        const objIndexmin = this.allFilterOptions.price.findIndex((obj => obj.value.startsWith(x)));
        this.allFilterOptions.price[objIndexmin].isSelected = true;

        const objIndexmax = this.allFilterOptions.price.findIndex((obj => obj.value.includes(y)));
        this.allFilterOptions.price[objIndexmax].isSelected = true;
      } else {
        this.minPrices = 0;
        this.maxPrices = 0;
      }

      if (this.route.snapshot.queryParams['pageNumber'] && this.route.snapshot.queryParams['pageSize']) {
        this.page = +this.route.snapshot.queryParams['pageNumber'];
        this.selectedPageSize = +this.route.snapshot.queryParams['pageSize'];
      } else {
        this.page = 1;
        this.selectedPageSize = 15;
      }

      // minPrice: 0, maxPrice: 0,
      this.getAllSelectedFilters();
      // this.getFilteredProducts();
      this.store.dispatch(new ProductGetList(
        this.productStoreService.getProductGetListParams(
          {
            categoryId: this.route.snapshot.queryParams['cat'],
             pageNumber: this.page, pageSize: this.selectedPageSize, typeId: this.typeIds,
            sizeId: this.sizeIds, countryId: this.countryIds, regionId: this.regionIds, varietalId: this.varietalIds,
            minPrice: this.minPrices, maxPrice: this.maxPrices, keyWord: this.dataservice.searchByText
          }
        )));
      // this.allVarietals = this.dataservice.allVarietals;
      // this.getAllSelectedFilters();
      // this.getFilteredProducts();

  }

  getAllSelectedFilters() {
    this.selectedFilters = [];
    this.selectedTypes = this.getSelectedFilterOptions(this.allFilterOptions.type);
    this.selectedSizes = this.getSelectedFilterOptions(this.allFilterOptions.size);
    this.selectedPrices = this.getSelectedFilterOptions(this.allFilterOptions.price);

    this.selectedVarietals = this.getSelectedFilterOptions(this.allVarietals);

    if (this.allFilterOptions.countries.length > 0) {
      this.selectedCountries = this.getSelectedFilterOptions(this.allFilterOptions.countries);
      this.selectedRegions = this.getSelectedFilterOptions(this.allRegions);
    }

    this.selectedFilters = [...this.selectedTypes, ...this.selectedVarietals, ...this.selectedSizes, ...this.selectedPrices,
    ...this.selectedCountries, ...this.selectedRegions];
  }

  onSelectionChange(item) {
    item.isSelected = !item.isSelected;

    this.getAllSelectedFilters();
    this.getFilteredProducts();
  }

  onPageChange(pageNo) {
    this.page = pageNo;
    this.getFilteredProducts();
  }
  onCountrySelectionChange(country: Country) {
    country.isSelected = !country.isSelected;
    this.getRegions();
    /* if (country.isSelected) {
      this.allRegions = [...this.allRegions, ...country.regions];
    } else {
      country.regions.forEach(region => {
        const rindex = this.allRegions.indexOf(region);
        if (rindex !== -1) {
          this.allRegions.splice(rindex, 1);
        }
      });
    }

    this.getAllSelectedFilters();
    this.getFilteredProducts(); */
  }

  onTypeSelectionChange(type: ProductType) {
    type.isSelected = !type.isSelected;
    this.getVarietals();

    /* if (type.isSelected) {
     this.allVarietals = [...this.allVarietals, ...type.varietals];
   } else {
     type.varietals.forEach(varietal => {
       const rindex = this.allVarietals.indexOf(varietal);
       if (rindex !== -1) {
         this.allVarietals.splice(rindex, 1);
       }
     });
   }

   this.getAllSelectedFilters();
   this.getFilteredProducts();*/
  }

  getVarietals() {
    this.allVarietals = [];
    this.allFilterOptions.type.filter(type => type.isSelected === true).forEach(item => {
      this.allVarietals = [...this.allVarietals, ...item.varietals];
    });

    if (this.allFilterOptions.type.filter(type => type.isSelected === true).length === 0) {
      this.getAllVarietals();
    }

    this.getAllSelectedFilters();
    this.getFilteredProducts();
  }
  getAllVarietals() {
    if (this.allFilterOptions && this.allFilterOptions.type) {
      this.allVarietals = this.allFilterOptions.type.reduce((acc, item) => [...acc, ...item.varietals], []);
    }
  }

  getRegions() {
    this.allRegions = [];
    this.allFilterOptions.countries.filter(country => country.isSelected === true).forEach(item => {
      this.allRegions = [...this.allRegions, ...item.regions];
    });

    if (this.allFilterOptions.countries.filter(country => country.isSelected === true).length === 0) {
      this.getAllRegions();
    }

    this.getAllSelectedFilters();
    this.getFilteredProducts();
  }

  getAllRegions() {
    if (this.allFilterOptions && this.allFilterOptions.countries) {
      this.allRegions = this.allFilterOptions.countries.reduce((acc, item) => [...acc, ...item.regions], []);
    }
  }

  getSelectedFilterOptions(filterType): any[] {
    if (filterType) {
      return filterType.filter(type => type.isSelected === true);
    } else {
      return [];
    }
  }

  removeFilter(filter) {

    const index = this.selectedFilters.findIndex(item => item === filter);
    if (index !== -1) {
      this.selectedFilters.splice(index, 1);

      if (filter.id === '001') {
        this.dataservice.searchByText = '';
        this.getAllSelectedFilters();
        this.getProductsByKeyword();
        return;
      }
    }

    const tindex = this.allFilterOptions.type.findIndex(item => item.value === filter.value);
    if (tindex !== -1) {
      this.allFilterOptions.type[tindex].isSelected = false;
      this.getAllSelectedFilters();
      this.getFilteredProducts();
      return;
    }

    const sindex = this.allFilterOptions.size.findIndex(item => item.value === filter.value);
    if (sindex !== -1) {
      this.allFilterOptions.size[sindex].isSelected = false;
      this.getAllSelectedFilters();
      this.getFilteredProducts();
      return;
    }

    const pindex = this.allFilterOptions.price.findIndex(item => item.value === filter.value);
    if (pindex !== -1) {
      this.allFilterOptions.price[pindex].isSelected = false;
      this.getAllSelectedFilters();
      this.getFilteredProducts();
    }

    const vindex = this.allVarietals.findIndex(item => item.value === filter.value);
    if (vindex !== -1) {
      this.allVarietals[vindex].isSelected = false;
      this.getAllSelectedFilters();
      this.getFilteredProducts();
    }
    const couindex = this.allFilterOptions.countries.findIndex(item => item.value === filter.value);
    if (couindex !== -1) {
      this.allFilterOptions.countries[couindex].isSelected = false;
      this.getAllSelectedFilters();
      this.getFilteredProducts();
    }

    const regindex = this.allRegions.findIndex(item => item.value === filter.value);
    if (regindex !== -1) {
      this.allRegions[regindex].isSelected = false;
      this.getAllSelectedFilters();
      this.getFilteredProducts();
    }

  }
  onPageSizeChange() {
    this.getFilteredProducts();
  }

  /* getFeatureProducts() {
    this.spinnerService.show();
    this.store.dispatch(new ProductGetList(
      this.productStoreService.getProductGetListParams(
        {
          isFeatured: this.dataservice.isFeatureProduct, pageSize: this.selectedPageSize
        }
      )));
  } */

  getProductsByKeyword() {
    // this.spinnerService.show();
    this.progressBarService.show();
    this.store.dispatch(new ProductGetList(
      this.productStoreService.getProductGetListParams(
        {
          categoryId: this.dataservice.categoryId, pageSize: this.selectedPageSize, keyWord: this.dataservice.searchByText
        }
      )));
  }
  getFilteredProducts() {

    let types = '';
    let varietals = '';
    let sizes = '';
    let countries = '';
    let regions = '';
    let minPrice = 0;
    let maxPrice = 0;

    if (this.selectedTypes && this.selectedTypes.length > 0) {
      types = this.selectedTypes.map((res: Item) => res.id).join(',');
    }

    if (this.selectedVarietals && this.selectedVarietals.length > 0) {
      varietals = this.selectedVarietals.map((res: Item) => res.id).join(',');
    }

    if (this.selectedSizes && this.selectedSizes.length > 0) {
      sizes = this.selectedSizes.map((res: Item) => res.id).join(',');
    }
    if (this.selectedPrices && this.selectedPrices.length > 0) {
      const prices = this.selectedPrices.map((res: Item) => res.value);

      if (prices[0].match(/\d+/g)) {
        minPrice = prices[0].match(/\d+/g).map(Number)[0];
      }

      if (prices[prices.length - 1].match(/\d+/g) && prices[prices.length - 1].match(/\d+/g).length > 1) {
        maxPrice = prices[prices.length - 1].match(/\d+/g).map(Number)[1];
      } else {
        maxPrice = 99999;
      }
    }

    if (this.selectedCountries && this.selectedCountries.length > 0) {
      countries = this.selectedCountries.map((res: Item) => res.id).join(',');
    }

    if (this.selectedRegions && this.selectedRegions.length > 0) {
      regions = this.selectedRegions.map((res: Item) => res.id).join(',');
    }
    // this.spinnerService.show();
    this.progressBarService.show();
    const obj = {
      cat: this.route.snapshot.queryParams['cat'], pageNumber: this.page, pageSize: this.selectedPageSize, typeId: types,
      sizeId: sizes, countryId: countries, regionId: regions, varietalId: varietals,
      minPrice: minPrice, maxPrice: maxPrice, keyword: this.dataservice.searchByText, storeid: localStorage.getItem('storeId')
    };
    for (const prop in obj) {
      if (obj[prop] === null || obj[prop] === undefined || obj[prop] === '') {
        delete obj[prop];
      }
    }
    this.router.navigate(
      [],
      {
        relativeTo: this.route,
        queryParams: obj
      });
  }

  clearSearch() {
    this.allFilterOptions.type.map(type => type.isSelected = false);
    this.allFilterOptions.size.map(size => size.isSelected = false);
    this.allFilterOptions.price.map(price => price.isSelected = false);
    this.allVarietals.map(varietal => varietal.isSelected = false);
    this.getAllSelectedFilters();
    this.getFilteredProducts();
  }

 /*  ngOnDestroy() {
    if (this.navigationSubscription) {
      this.navigationSubscription.unsubscribe();
    }
  } */
}

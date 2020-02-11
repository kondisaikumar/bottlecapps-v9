import { Component, OnInit, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CartService } from '../../../services/cart.service';
import { PaymentService } from '../../../services/payment.service';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { PlaceOrderForOnlinePayment } from '../../../models/place-order-onlinepayment';
import { CustomerService } from '../../../services/customer.service';
import { Store } from '@ngrx/store';
import { CustomerLoginSession } from '../../../models/customer-login-session';
import { StoreGetHome } from '../../../state/product-store/product-store.action';
import { VantivPaymentServerSideApiService } from '../../../services/vantiv-payment-serverside-api.service';
import { CommonService } from '../../../shared/services/common.service';
import { ProgressBarService } from '../../../shared/services/progress-bar.service';
import { ProductStoreService } from '../../../services/product-store.service';

@Component({
  selector: 'app-checkout-products',
  templateUrl: './checkout-products.component.html',
  styleUrls: ['./checkout-products.component.scss']
})
export class CheckoutProductsComponent implements OnInit {
  @Output() orderplace = new EventEmitter();
  @ViewChild('openCartReviewModal', {static: false}) openModal: ElementRef;
  @ViewChild('openPriceModal', {static: false}) openPriceModal: ElementRef;
  cartDetails: any;
  isCouponError = false;
  isExpand = false;
  isTipExpand = true;
  coupon = '#APPLYBESTCOUPON';
  couponCode: any;
  tipAmount: string;
  listCharges: any;
  isCouponApplied: boolean;
  isCheckoutSubmitted: boolean;
  reviewItems: any;
  oldCharge: any;
  oldSubTotal: any;
  reviewPrice: string;
  newCharge: any;
  hikecharge: any;
  couponAvailable = false;

  constructor(private cartService: CartService, private router: Router,
    private paymentService: PaymentService,
    private toastr: ToastrService,
    private customerService: CustomerService,
    private progressBarService: ProgressBarService,
    private vantivPaymentService: VantivPaymentServerSideApiService,
    private store: Store<CustomerLoginSession>,
    private storeService: ProductStoreService,
    private commonService: CommonService) {
    this.couponAvailable = this.storeService.couponAvailablecheckout;
    console.log(this.storeService.orderType);
    this.cartService.cartUpdated.subscribe(() => {
      this.cartDetails = this.cartService.cartdetails;
      this.filterCartDetails();
    });
  }

  ngOnInit() {
    this.couponCode = '';
    this.tipAmount = '';
    this.isCouponApplied = false;
    this.isCheckoutSubmitted = false;
    this.cartDetails = this.cartService.cartdetails;
    this.filterCartDetails();
  }

  filterCartDetails() {
    this.cartDetails.ListCartItem = this.cartDetails.ListCartItem.filter(item => item.Quantity !== 0);
    this.cartDetails.ListCartItem.map(item => item.QuantityOrdered = item.Quantity);

    const tip = this.cartDetails.ListCharge.filter(charge => charge.ChargeTitle === 'Tip')[0];
    if (tip) {
      this.tipAmount = tip.ChargeAmountDisplay;
    }
    this.listCharges = this.cartDetails.ListCharge.filter(charge => charge.ChargeTitle !== 'Tip');

    if (this.cartDetails.OrderTypeId === 2 && this.cartDetails.ListTipForDriver.length > 0) {
      if (this.cartDetails.ListTipForDriver.filter(item => item.Percentage === 0).length === 0) {
        const otherTip = { 'Percentage': 0, 'TipAmount': '', 'TipAmountDisplay': 'Other', 'IsDeafault': false };
        this.cartDetails.ListTipForDriver.push(otherTip);
      }
    }
    this.oldSubTotal = this.cartDetails.SubTotal;
    const oldCharge = this.cartDetails.ListCharge.filter(charge => charge.ChargeId === 3)[0];
    if (oldCharge) {
      this.oldCharge = oldCharge.ChargeAmount;
    }
    // console.log('old details', this.oldSubTotal, this.oldCharge);

  }

  doStockAvailabilityCheck() {
    if (!(this.cartDetails && this.cartDetails.ListCartItem)) {
      return;
    }
    this.reviewItems = this.cartDetails.ListCartItem.filter(item => item.Quantity !== item.QuantityOrdered);

    if (this.reviewItems && this.reviewItems.length > 0) {
      this.openModal.nativeElement.click();
    } else if (this.reviewItems && this.reviewItems.length === 0) {
      this.doCheckchangeinSubTotal();
    }

  }
  doCheckchangeinSubTotal() {
    if (this.cartDetails.SubTotal !== this.oldSubTotal) {
      this.reviewPrice = 'There was a price change for some of the items in your cart please review before placing the order';
      this.openPriceModal.nativeElement.click();
    } else {
      this.doCheckHikeinDeliverycharge();
    }
  }
  doCheckHikeinDeliverycharge() {
    this.newCharge = this.cartDetails.ListCharge.filter(charge => charge.ChargeId === 3)[0].ChargeAmount;
    // console.log(this.newCharge);
    this.hikecharge = ((this.oldCharge / 100) * 10) + this.oldCharge;
    if (this.newCharge > this.hikecharge) {
      this.reviewPrice = 'There is a change in your delivery charge, please review before placing the order';
      this.openPriceModal.nativeElement.click();
    } else {
      this.afterDoCheck();
    }
  }
  onCancelOrder() {
    this.clearPaymentCache();
    this.isCheckoutSubmitted = false;
    this.router.navigate(['/cart']);
  }

  onCheckout() {
    console.log(this.storeService.orderType);
    /* this.cartDetails.OrderTypeId = 1;
    this.cartDetails.AddressId = 0;
    this.cartDetails.PaymentTypeId = 0; */

    // if (this.cartDetails.PaymentTypeId === 0) {
    if (this.storeService.orderType === 'Pickup') {
      if (
        !this.cartDetails.Profile ||
        this.cartDetails.Profile.ContactNo === '' ||
        this.cartDetails.Profile.FirstName === '' ||
        this.cartDetails.Profile.LastName === '') {
        this.toastr.error('Please complete your profile');
        return;
      }
      // }

      if (this.cartDetails.OrderTypeId === 2 && this.cartDetails.AddressId === 0) {
        this.toastr.error('Please Select Address');
        return;
      }
      if (this.cartDetails.PaymentTypeId === 1 &&
        this.paymentService.createTransaction.customerPaymentProfileId === '') {
        this.toastr.error('Please Select Payment Method');
        return;
      }

      if (this.cartDetails.PaymentTypeId === 7 &&
        this.vantivPaymentService.vUserSelectedPaymentAccountID === '') {
        this.toastr.error('Please Select Payment Method');
        return;
      }

      if ((this.cartDetails.PaymentTypeId === 1) &&
        this.paymentService.createTransaction.cvv === 0 || this.paymentService.createTransaction.cvv.toString() === '') {
        this.toastr.error('Please Enter CVV');
        return;
      }

      const data = {
        amount: this.cartDetails.TotalValue,
        taxAmount: this.cartDetails.ListCharge.filter(item => item.ChargeTitle === 'Tax')[0].ChargeAmount,
        taxType: 'Sales Tax'
      };

      this.isCheckoutSubmitted = true;

      this.commonService.onOrderPlaced(true);
      if (this.cartDetails.PaymentTypeId === 0) {
        this.placeOrder();
      } else if (this.cartDetails.PaymentTypeId === 1) {
        this.paymentService.createTransactionRequest(data).subscribe(paymentResponse => {
          const Cards = paymentResponse.AuthResponse;
          const cardData = JSON.parse(Cards);
          if (cardData.transactionResponse && cardData.transactionResponse.responseCode === '1') {
            this.placeOrderForOnlinePayment(cardData);
            this.progressBarService.hide();
          } else if (cardData.transactionResponse && cardData.transactionResponse.responseCode === '2') {
            this.orderplace.emit();
            this.toastr.error(cardData.transactionResponse.errors[0].errorText);
            this.progressBarService.hide();
          }
        });
      } else if (this.cartDetails.PaymentTypeId === 7) {

        if (this.vantivPaymentService.vantiveProfile) {
          this.vantivPaymentService.CreditCardPayment(data.amount).subscribe((paymentResponse: any) => {
            if (this.vantivPaymentService.vExpressResponseCode === '0') {
              this.placeOrderForOnlinePayment(this.parseVantivResponse(paymentResponse));
            } else {
              this.orderplace.emit();
            }
          });
        }
      }
    } else {

      this.progressBarService.show();
      let cartbody: any;
      cartbody = {
        IsFromCheckOut: true,
        IsToCallDSP: true
      };
      this.cartService.getCartDetails(cartbody).subscribe(
        // tslint:disable-next-line:no-shadowed-variable
        (response: any) => {
          this.cartDetails = response;
          this.progressBarService.hide();
          if (response && response.Remark !== '') {
            this.toastr.error(response.Remark);
            return;
          }
          // tslint:disable-next-line:max-line-length
          if (this.cartDetails && this.cartDetails.CartDeliverySolution && this.cartDetails.CartDeliverySolution.DeliverySolutionRemark !== '') {
            this.toastr.error(this.cartDetails.CartDeliverySolution.DeliverySolutionRemark);
            this.cartService.cartNewDeliverySlots.next(this.cartDetails);
            return;
          }
          if (this.cartService.selectedDeliveryTime === '') {
            this.toastr.error('Please Select Delivery Date & Time');
            return;
          }
          if (
            !this.cartDetails.Profile ||
            this.cartDetails.Profile.ContactNo === '' ||
            this.cartDetails.Profile.FirstName === '' ||
            this.cartDetails.Profile.LastName === '') {
            this.toastr.error('Please complete your profile');
            return;
          }
          // }

          if (this.cartDetails.OrderTypeId === 2 && this.cartDetails.AddressId === 0) {
            this.toastr.error('Please Select Address');
            return;
          }
          if (this.cartDetails.PaymentTypeId === 1 &&
            this.paymentService.createTransaction.customerPaymentProfileId === '') {
            this.toastr.error('Please Select Payment Method');
            return;
          }

          if (this.cartDetails.PaymentTypeId === 7 &&
            this.vantivPaymentService.vUserSelectedPaymentAccountID === '') {
            this.toastr.error('Please Select Payment Method');
            return;
          }

          if ((this.cartDetails.PaymentTypeId === 1) &&
            this.paymentService.createTransaction.cvv === 0 || this.paymentService.createTransaction.cvv.toString() === '') {
            this.toastr.error('Please Enter CVV');
            return;
          }
          this.doStockAvailabilityCheck();
        });
    }

  }
  afterDoCheck() {
    const data = {
      amount: this.cartDetails.TotalValue,
      taxAmount: this.cartDetails.ListCharge.filter(item => item.ChargeTitle === 'Tax')[0].ChargeAmount,
      taxType: 'Sales Tax'
    };

    this.isCheckoutSubmitted = true;

    this.commonService.onOrderPlaced(true);
    if (this.cartDetails.PaymentTypeId === 0) {
      this.placeOrder();
    } else if (this.cartDetails.PaymentTypeId === 1) {
      this.progressBarService.show();
      this.paymentService.createTransactionRequest(data).subscribe(paymentResponse => {
        const Cards = paymentResponse.AuthResponse;
        const cardData = JSON.parse(Cards);
        if (cardData.transactionResponse && cardData.transactionResponse.responseCode === '1') {
          this.placeOrderForOnlinePayment(cardData);
          this.progressBarService.hide();
        } else if (cardData.transactionResponse && cardData.transactionResponse.responseCode === '2') {
          this.orderplace.emit();
          this.toastr.error(cardData.transactionResponse.errors[0].errorText);
          this.progressBarService.hide();
        }
      });
    } else if (this.cartDetails.PaymentTypeId === 7) {

      if (this.vantivPaymentService.vantiveProfile) {
        this.progressBarService.show();
        this.vantivPaymentService.CreditCardPayment(data.amount).subscribe((paymentResponse: any) => {
          if (this.vantivPaymentService.vExpressResponseCode === '0') {
            this.placeOrderForOnlinePayment(this.parseVantivResponse(paymentResponse));
            this.progressBarService.hide();
          } else {
            this.progressBarService.hide();
            this.orderplace.emit();
          }
        });
      }
    }
  }
  parseVantivResponse(response) {

    let req;
    let res;

    if (response.VantivAction === 'Sale') {
      if (
        response.TransactionResponse &&
        response.TransactionResponse.CreditCardSaleResponse &&
        response.TransactionResponse.CreditCardSaleResponse.Response) {

        res = response.TransactionResponse.CreditCardSaleResponse.Response;
      }
    } else {
      if (
        response.TransactionResponse &&
        response.TransactionResponse.CreditCardAuthorizationResponse &&
        response.TransactionResponse.CreditCardAuthorizationResponse.Response) {

        res = response.TransactionResponse.CreditCardAuthorizationResponse.Response;
      }
    }
    if (res) {
      req = {
        'Address': {
          'BillingAddress1': res.Address.BillingAddress1 || ''
        },
        'Batch': {
          // 'HostBatchAmount': '7946.21',
          'HostBatchID': res.Batch.HostBatchID || ''
          // 'HostItemID': '352'
        },
        'Card': {
          'AVSResponseCode': res.Card.AVSResponseCode || '',
          'BIN': res.Card.BIN || '',
          'CardLogo': res.Card.CardLogo || '',
          'CardNumberMasked': res.Card.CardNumberMasked || ''
        },
        'ExpressResponseCode': res.ExpressResponseCode || '',
        'ExpressResponseMessage': res.ExpressResponseMessage || '',
        'ExpressTransactionDate': res.ExpressTransactionDate || '',
        'ExpressTransactionTime': res.ExpressTransactionTime || '',
        'ExpressTransactionTimezone': res.ExpressTransactionTimezone || '',
        'HostResponseCode': res.HostResponseCode || '',
        'HostResponseMessage': res.HostResponseMessage || '',
        'PaymentAccount': {
          'PaymentAccountID': this.vantivPaymentService.vUserSelectedPaymentAccountID,
          'PaymentAccountReferenceNumber': res.PaymentAccount.PaymentAccountReferenceNumber
        },
        'Transaction': {
          'AcquirerData': res.Transaction.AcquirerData,
          'ApprovalNumber': res.Transaction.ApprovalNumber,
          'ApprovedAmount': res.Transaction.ApprovedAmount,
          'ProcessorName': res.Transaction.ProcessorName,
          'ReferenceNumber': res.Transaction.ReferenceNumber,
          'TransactionID': res.Transaction.TransactionID,
          'TransactionStatus': res.Transaction.TransactionStatus,
          'TransactionStatusCode': res.Transaction.TransactionStatusCode
        }
      };
    }

    return req;
  }

  placeOrder() {
    this.progressBarService.show();
    let data: any;
    data = {
      'AppId': this.cartDetails.AppId,
     'CartId': this.cartDetails.CartId,
      'DeviceId': this.customerService.customerSession.DeviceId,
      'DeviceType': this.customerService.customerSession.DeviceId,
      'OrderTypeId': this.cartDetails.OrderTypeId,
      'PaymentTypeId': this.cartDetails.PaymentTypeId,
      'SessionId': this.cartDetails.SessionId,
      'StoreId': this.cartDetails.StoreId,
      'UserId': this.cartDetails.UserId,
      'UserRemarks': this.cartService.DeliveryInstruction
    };
    this.cartService.placeOrder(data).subscribe(
      (orderResponse: any) => {
        this.cartDetails = orderResponse;
        if (this.cartDetails.OrderId !== 0) {
          this.commonService.onOrderPlaced(false);
          this.toastr.success('Order Placed Successfully.');
          this.progressBarService.hide();
          this.store.dispatch(new StoreGetHome());
        }
        this.isCheckoutSubmitted = false;
        this.progressBarService.hide();
        this.clearPaymentCache();
        this.orderplace.emit(this.cartDetails);

      });
  }

  placeOrderForOnlinePayment(data) {
    const placeOrderReq = this.getPlaceOrderRequestParamsForOnlinePayment(data);

    if (placeOrderReq) {
      this.cartService.placeOrder(placeOrderReq).subscribe(
        (orderResponse: any) => {
          this.cartDetails = orderResponse;
          this.isCheckoutSubmitted = false;
          if (this.cartDetails.OrderId !== 0) {
            this.commonService.onOrderPlaced(false);
            this.toastr.success('Order Placed Successfully.');
            this.store.dispatch(new StoreGetHome());
          }
          this.clearPaymentCache();
          this.orderplace.emit(this.cartDetails);
        });
    } else {
      this.commonService.onOrderPlaced(false);
      this.toastr.error('Invalid Session, Please ReLogin ...');
    }

  }

  clearPaymentCache() {
    this.paymentService.createTransaction = {
      customerProfileId: '',
      customerPaymentProfileId: '',
      cvv: 0
    };
    this.vantivPaymentService.vUserSelectedPaymentAccountID = '';
  }
  private getPlaceOrderRequestParamsForOnlinePayment(data: any): PlaceOrderForOnlinePayment {
    if (!this.customerService.customerSession) {
      return null;
    }

    return {
      StoreId: this.customerService.customerSession.StoreId,
      SessionId: this.customerService.customerSession.SessionId,
      UserId: this.customerService.customerSession.UserId,
      AppId: this.customerService.customerSession.AppId,
      DeviceId: this.customerService.customerSession.DeviceId,
      DeviceType: this.customerService.customerSession.DeviceType,
      DoPDate: (this.cartDetails.OrderTypeId === 2) ? this.cartDetails.DoPDate : '',
      DoPSlot: (this.cartDetails.OrderTypeId === 2) ? this.cartDetails.DoPTimeSlot : '',
      CartId: this.cartDetails.CartId,
      CardInfo: data,
      UserRemarks: this.cartService.userRemarks,
      OrderTypeId: this.cartDetails.OrderTypeId,
      PaymentTypeId: this.cartDetails.PaymentTypeId,
      // tslint:disable-next-line:max-line-length
      DeliverySolutionEstimateId: (this.cartDetails.OrderTypeId === 2 && this.cartDetails.IsDeliverySolution === true) ? this.cartDetails.DeliverySolutionEstimateId : ''
    };
  }

  applyCoupon() {
    if (this.coupon.trim() !== '' && !this.isCouponApplied) {
      this.cartDetails.CouponCode = this.coupon;
      this.cartDetails.CartDsp = 'Y';
      this.cartDetails.IsFromCheckOut = true;
      this.cartDetails.IsToCallDSP = true;
      this.cartService.updateCart(this.cartDetails).subscribe(
        (data: any) => {
          this.cartDetails = data;
          if (data.Remark === '') {
            this.isCouponApplied = true;
            this.toastr.success('Coupon Applied Successfully.');

            this.couponCode = 'Applied Coupon ' + this.cartDetails.CouponCode;

            this.filterCartDetails();
          } else {
            if (this.cartDetails.CouponCode === '') {
              this.couponCode = 'No Coupons Found';
            }
          }
        });
    }
  }

  updateCart() {
    this.cartDetails.CartDsp = 'Y';
    this.cartDetails.IsFromCheckOut = true;
    this.cartDetails.IsToCallDSP = true;
    this.cartService.updateCart(this.cartDetails).subscribe(
      (data: any) => {
        this.cartDetails = data;
        this.filterCartDetails();
      });
  }

  clearCoupon() {
    this.coupon = '';
    this.isCouponApplied = false;
    if (this.cartDetails.CouponCode !== '') {
      this.cartDetails.CouponCode = this.coupon;
      this.cartDetails.CartDsp = 'Y';
      this.cartDetails.IsFromCheckOut = true;
      this.cartDetails.IsToCallDSP = true;
      this.cartService.updateCart(this.cartDetails).subscribe(
        (data: any) => {
          this.cartDetails = data;
          this.coupon = '#APPLYBESTCOUPON';
          this.couponCode = '';
          this.filterCartDetails();
        });
    }
  }
  onTipSelected(event: any, tip: any) {
    this.cartDetails.ListTipForDriver.forEach(item => {
      if (item.Percentage === tip.Percentage) {
        item.IsDeafault = true;
        // this.tipAmount = tip.TipAmountDisplay;
        this.cartDetails.TipForDriver = tip.TipAmount;

        if (tip.TipAmount !== '') {
          this.updateCart();
        }
      } else {
        item.IsDeafault = false;
      }
    });
  }

  onPopupClose() {
    this.router.navigate(['/cart']);
  }
  onPricePopupClose() {
    this.updateCart();
  }
}

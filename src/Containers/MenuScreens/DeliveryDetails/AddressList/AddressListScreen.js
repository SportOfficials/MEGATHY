/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from "react";
import { Platform, StyleSheet, AsyncStorage, Dimensions } from "react-native";
import {
    Text,
    View,
    TouchableOpacity,
    TouchableWithoutFeedback,
    SafeAreaView,
    FlatList,
    RefreshControl,
} from "react-native";

import constant from "../../../../Helper/Constants";

// Redux
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import * as actions from "../../../../AppRedux/Actions/actions";

// Device Info
var DeviceInfo = require("react-native-device-info");

// Common Utilities
import * as CommonUtilities from "../../../../Helper/CommonUtilities";

// Network Utility
import * as networkUtility from "../../../../Helper/NetworkUtility";

// IQKeyboard Manager
import KeyboardManager from "react-native-keyboard-manager";

// Loading View
import Spinner from "react-native-loading-spinner-overlay";
import Icon from "react-native-vector-icons/EvilIcons";

// Localization
import baseLocal from "../../../../Resources/Localization/baseLocalization";

// AddressListItem
import AddressListItem from "./AddressListItem";

class AddressListScreen extends Component {
    constructor(props) {
        super(props);

        baseLocal.locale = global.currentAppLanguage;

        // Bind Methods
        this._getAddressList = this._getAddressList.bind(this);
        this._onPressAddAddress = this._onPressAddAddress.bind(this);
        this._onPressAddressItem = this._onPressAddressItem.bind(this);
        this._onPressEditItem = this._onPressEditItem.bind(this);
        this._onPressDeleteItem = this._onPressDeleteItem.bind(this);
        this._onPressDeliverItem = this._onPressDeliverItem.bind(this);
        this._renderAddressItem = this._renderAddressItem.bind(this);
        this._onRefresh = this._onRefresh.bind(this);
        this._callLoadMore = this._callLoadMore.bind(this);
        this._keyExtractor = this._keyExtractor.bind(this);

        this.state = {
            arrAddress: [],
            visible: false,
            isRefreshing: false,
        };

        this.currentPage = 1;
        this.lastPage = 0;
    }

    static navigationOptions = ({ navigation }) => ({
        headerLeft: (
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View style={{ flexDirection: "row" }}>
                    <TouchableOpacity
                        onPress={() => {
                            // console.log("Nav Params :==> ",navigation.state.params);
                            if (navigation.state.params != undefined && navigation.state.params.category != undefined) {
                                navigation.goBack();
                            } else {
                                navigation.navigate("DrawerToggle");
                            }
                        }}
                    >
                        <Icon
                            name={
                                navigation.state.params != undefined && navigation.state.params.category != undefined
                                    ? "arrow-left"
                                    : "navicon"
                            }
                            style={{ marginLeft: 10 }}
                            size={35}
                            color="white"
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerText}> Meghathy </Text>
                </View>
            </View>
        ),
        headerStyle: {
            backgroundColor: "#CF2526",
        },
    });

    componentDidMount() {
        this._getAddressList(false);
    }

    _keyExtractor = (item, index) => item.id.toString();

    _callLoadMore() {
        if (this.currentPage < this.lastPage) {
            console.log("Call Load More .....");
            this._getAddressList(true);
        }
    }

    _onRefresh() {
        this.currentPage = 1;
        this.setState({ isRefreshing: true, arrAddress: [] }, () => {
            this._getAddressList(false);
        });
    }

    _getAddressList(isLoadMore) {
        let addressPage = this.currentPage;
        if (isLoadMore && this.currentPage < this.lastPage) {
            addressPage = addressPage + 1;
        }

        var addressParameters = {
            page: addressPage,
        };

        networkUtility.getRequest(constant.address, addressParameters).then(
            result => {
                let resultData = result.data.data;
                this.currentPage = resultData.current_page;
                this.lastPage = resultData.last_page;
                let newArrAddress = [...this.state.arrAddress, ...resultData.data].filter((val, id, array) => {
                    if ((this.currentPage === 1 && id === 0) || this.props.entryPoint === undefined) {
                        val.selected = true;
                    }
                    return array.indexOf(val) === id;
                });
                this.setState({
                    arrAddress: newArrAddress,
                    isRefreshing: false,
                    visible: false,
                });
            },
            error => {
                constants.debugLog("\nStatus Code: " + error.status);
                constants.debugLog("\nError Message: " + error);

                // Hide Loading View
                this.setState({ visible: false });

                if (error.status != 500) {
                    if (global.currentAppLanguage === constant.languageArabic && error.data["messageAr"] != undefined) {
                        setTimeout(() => {
                            alert(error.data["messageAr"]);
                        }, 200);
                    } else {
                        setTimeout(() => {
                            alert(error.data["message"]);
                        }, 200);
                    }
                } else {
                    constants.debugLog("Internal Server Error: " + error.data);
                    setTimeout(() => {
                        alert("Something went wrong, plese try again");
                    }, 200);
                }
            }
        );
    }

    _onPressAddAddress() {
        return;
        if (!CommonUtilities.validateEmail(this.state.email)) {
            CommonUtilities.showAlert("Invalid email id");
            return;
        }

        if (this.state.password === "") {
            CommonUtilities.showAlert("Password cannot be blank");
            return;
        }

        var loginParameters = {
            email: this.state.email,
            password: this.state.password,
            deviceType: Platform.OS === "ios" ? constant.deviceTypeiPhone : constant.deviceTypeAndroid,
            notifyId: constant.notifyId,
            timeZone: constant.timeZone,
            vendorId: DeviceInfo.getUniqueID(),
            appVersion: DeviceInfo.appVersion === undefined ? "0.0" : DeviceInfo.appVersion,
        };

        // Show Loading View
        this.setState({ visible: true });

        networkUtility.postRequest(constant.login, loginParameters).then(
            result => {
                // Hide Loading View
                this.setState({ visible: false });
                global.loginKey = result.data.data.userData.loginKey;
                AsyncStorage.setItem(constant.keyCurrentUser, JSON.stringify(result.data.data.userData));
                AsyncStorage.setItem(constant.keyCurrentSettings, JSON.stringify(result.data.data.settingData));
                AsyncStorage.removeItem(constant.keyCurrentStore);
                constant.debugLog("User Login Success");
                this.props.navigation.navigate("CityScreen");
            },
            error => {
                // Hide Loading View
                this.setState({ visible: false });

                constant.debugLog("Status Code: " + error.status);
                constant.debugLog("Error Message: " + error.message);
                if (error.status != 500) {
                    if (global.currentAppLanguage === constant.languageArabic && error.data["messageAr"] != undefined) {
                        CommonUtilities.showAlert(error.data["messageAr"], false);
                    } else {
                        setTimeout(() => {
                            CommonUtilities.showAlert(error.data["message"], false);
                        }, 200);
                    }
                } else {
                    constant.debugLog("Internal Server Error: " + error.data);
                    CommonUtilities.showAlert("Opps! something went wrong");
                }
            }
        );
    }

    _renderAddressItem = ({ item }) => (
        <AddressListItem
            address={item}
            parentEntryPoint={this.props.entryPoint}
            onPressItem={this._onPressAddressItem}
            onPressEditItem={this._onPressEditItem}
            onPressDeleteItem={this._onPressDeleteItem}
            onPressDeliverItem={this._onPressDeliverItem}
        />
    );

    _onPressAddressItem(address) {
        let arrAddressTemp = this.state.arrAddress;
        arrAddressTemp.map((addressTemp, index, arrObjects) => {
            if (addressTemp.id === address.id) {
                addressTemp.selected = true;
            } else if (addressTemp.selected != undefined) {
                delete addressTemp.selected;
            }
        });

        this.setState({
            arrAddress: arrAddressTemp,
        });
    }

    _onPressEditItem(address) {

    }

    _onPressDeleteItem(address) {
        
    }

    render() {
        return (
            // Main View (Container)
            <View style={{ flex: 1 }}>
                <SafeAreaView style={styles.container}>
                    {/* // Address List */}
                    {this.state.arrAddress.length > 0 ? (
                        <FlatList
                            style={{
                                marginTop: 8,
                                width: "95%",
                                height: "89%",
                            }}
                            ref={flatList => {
                                this.arrAddress = flatList;
                            }}
                            refreshControl={
                                <RefreshControl refreshing={this.state.isRefreshing} onRefresh={this._onRefresh} />
                            }
                            data={this.state.arrAddress}
                            keyExtractor={this._keyExtractor}
                            renderItem={this._renderAddressItem}
                            showsHorizontalScrollIndicator={false}
                            removeClippedSubviews={false}
                            directionalLockEnabled
                            onEndReached={this._callLoadMore}
                            onEndReachedThreshold={0.7}
                        />
                    ) : (
                        <View style={{marginTop:8, width:"95%", height:"89%"}}/>
                        // <Spinner visible={this.state.visible} cancelable={true} textStyle={{ color: "#FFF" }} />
                    )}

                    {/* // Add New Address Button */}
                    <TouchableOpacity style={styles.loginButtonStyle} onPress={this._onPressAddAddress}>
                        <Text style={{ color: "white", fontFamily: "Ebrima", fontWeight: "bold" }}>
                            {baseLocal.t("Add New Address")}
                        </Text>
                    </TouchableOpacity>
                </SafeAreaView>
            </View>
        );
    }
}

function mapStateToProps(state, props) {
    return {
        firstComp: state.dataReducer.firstComp,
    };
}

function mapDispatchToProps(dispatch) {
    return bindActionCreators(actions, dispatch);
}

export default connect(
    mapStateToProps,
    mapDispatchToProps
)(AddressListScreen);

const styles = StyleSheet.create({
    container: {
        // flex: 1,
        justifyContent: "center",
        alignItems: "center",
        // backgroundColor: "#CF2526",
    },
    fbButtonStyle: {
        flex: 1,
        flexDirection: "row",
        backgroundColor: "#EAEAEA",
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 20,
    },
    loginButtonStyle: {
        width: "95%",
        marginTop: 8,
        backgroundColor: constant.themeColor,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        // borderRadius: 20,
    },
    scrollView: {
        flexGrow: 1,
        justifyContent: "center",
        alignItems: "center",
        height: Dimensions.get("window").height,
    },
    headerText: {
        color: "white",
        margin: 4,
        // marginLeft: 5,
        fontSize: 15,
        fontFamily: constant.themeFont,
    },
});

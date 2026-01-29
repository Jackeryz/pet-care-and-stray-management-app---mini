import Map "mo:core/Map";
import Text "mo:core/Text";
import List "mo:core/List";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Nat32 "mo:core/Nat32";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Blob "mo:core/Blob";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  // Include File Storage
  include MixinStorage();

  // Initialize the authorization system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Data Types
  type Role = {
    #admin;
    #petOwner;
    #veterinarian;
    #ngo;
    #publicUser;
  };

  public type UserProfile = {
    name : Text;
    email : Text;
    role : Role;
  };

  type User = {
    id : Principal;
    name : Text;
    email : Text;
    role : Role;
  };

  type Pet = {
    id : Nat32;
    name : Text;
    breed : Text;
    age : Nat32;
    owner : Principal;
    photo : Blob;
    assignedVet : ?Principal;
  };

  type MedicalRecord = {
    petId : Nat32;
    vaccinations : [Text];
    treatments : [Text];
    healthLogs : [Text];
  };

  type StrayReport = {
    id : Nat32;
    location : Text;
    photo : Blob;
    description : Text;
    reporter : Principal;
    status : ReportStatus;
  };

  type ReportStatus = {
    #reported;
    #verified;
    #rescued;
    #resolved;
  };

  type AdoptionRecord = {
    id : Nat32;
    petId : Nat32;
    applicant : Principal;
    status : AdoptionStatus;
  };

  type AdoptionStatus = {
    #pending;
    #approved;
    #rejected;
  };

  type Product = {
    id : Nat32;
    name : Text;
    description : Text;
    price : Nat32;
    stock : Nat32;
  };

  type Order = {
    id : Nat32;
    userId : Principal;
    products : [Product];
    total : Nat32;
    status : OrderStatus;
  };

  type OrderStatus = {
    #pending;
    #shipped;
    #delivered;
    #cancelled;
  };

  // Storage
  let userProfiles = Map.empty<Principal, UserProfile>();
  let users = Map.empty<Principal, User>();
  let pets = Map.empty<Nat32, Pet>();
  let medicalRecords = Map.empty<Nat32, MedicalRecord>();
  let strayReports = Map.empty<Nat32, StrayReport>();
  let adoptionRecords = Map.empty<Nat32, AdoptionRecord>();
  let products = Map.empty<Nat32, Product>();
  let orders = Map.empty<Nat32, Order>();

  // Helper Functions
  func getId() : Nat32 {
    Nat32.fromIntWrap(Time.now());
  };

  module Pet {
    public func compare(pet1 : Pet, pet2 : Pet) : Order.Order {
      Text.compare(pet1.name, pet2.name);
    };
  };

  // User Profile Management (Required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Pet Management
  public shared ({ caller }) func createPet(name : Text, breed : Text, age : Nat32, photo : Blob) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can add pets");
    };
    let id = getId();
    let pet : Pet = {
      id;
      name;
      breed;
      age;
      owner = caller;
      photo;
      assignedVet = null;
    };
    pets.add(id, pet);
  };

  public query ({ caller }) func getPet(id : Nat32) : async Pet {
    switch (pets.get(id)) {
      case (null) { Runtime.trap("Pet not found") };
      case (?pet) {
        // Owner, assigned vet, or admin can view
        let isOwner = pet.owner == caller;
        let isAssignedVet = switch (pet.assignedVet) {
          case (?vet) { vet == caller };
          case (null) { false };
        };
        let isAdmin = AccessControl.isAdmin(accessControlState, caller);
        
        if (not (isOwner or isAssignedVet or isAdmin)) {
          Runtime.trap("Unauthorized: Only the owner, assigned veterinarian, or admin can view this pet");
        };
        pet;
      };
    };
  };

  public query ({ caller }) func listPets() : async [Pet] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can list pets");
    };
    
    // Users see only their own pets, admins see all
    if (AccessControl.isAdmin(accessControlState, caller)) {
      pets.values().toArray();
    } else {
      pets.values().toArray().filter<Pet>(func(pet : Pet) : Bool {
        pet.owner == caller or (switch (pet.assignedVet) {
          case (?vet) { vet == caller };
          case (null) { false };
        });
      });
    };
  };

  public shared ({ caller }) func assignVetToPet(petId : Nat32, vetPrincipal : Principal) : async () {
    switch (pets.get(petId)) {
      case (null) { Runtime.trap("Pet not found") };
      case (?pet) {
        // Only owner or admin can assign vet
        if (pet.owner != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the pet owner or admin can assign a veterinarian");
        };
        
        let updatedPet = {
          id = pet.id;
          name = pet.name;
          breed = pet.breed;
          age = pet.age;
          owner = pet.owner;
          photo = pet.photo;
          assignedVet = ?vetPrincipal;
        };
        pets.add(petId, updatedPet);
      };
    };
  };

  // Medical Records
  public shared ({ caller }) func addMedicalRecord(petId : Nat32, vaccinations : [Text], treatments : [Text]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can add medical records");
    };
    
    // Verify caller is owner or assigned vet
    switch (pets.get(petId)) {
      case (null) { Runtime.trap("Pet not found") };
      case (?pet) {
        let isOwner = pet.owner == caller;
        let isAssignedVet = switch (pet.assignedVet) {
          case (?vet) { vet == caller };
          case (null) { false };
        };
        
        if (not (isOwner or isAssignedVet)) {
          Runtime.trap("Unauthorized: Only the pet owner or assigned veterinarian can add medical records");
        };
        
        let record : MedicalRecord = {
          petId;
          vaccinations;
          treatments;
          healthLogs = [];
        };
        medicalRecords.add(petId, record);
      };
    };
  };

  public query ({ caller }) func getMedicalRecord(petId : Nat32) : async MedicalRecord {
    // Verify caller has access to the pet
    switch (pets.get(petId)) {
      case (null) { Runtime.trap("Pet not found") };
      case (?pet) {
        let isOwner = pet.owner == caller;
        let isAssignedVet = switch (pet.assignedVet) {
          case (?vet) { vet == caller };
          case (null) { false };
        };
        let isAdmin = AccessControl.isAdmin(accessControlState, caller);
        
        if (not (isOwner or isAssignedVet or isAdmin)) {
          Runtime.trap("Unauthorized: Only the owner, assigned veterinarian, or admin can view medical records");
        };
        
        switch (medicalRecords.get(petId)) {
          case (null) { Runtime.trap("Medical record not found") };
          case (?record) { record };
        };
      };
    };
  };

  // Stray Reports
  public shared ({ caller }) func reportStray(location : Text, photo : Blob, description : Text) : async () {
    // Anyone can report strays (including guests)
    let id = getId();
    let report : StrayReport = {
      id;
      location;
      photo;
      description;
      reporter = caller;
      status = #reported;
    };
    strayReports.add(id, report);
  };

  public query ({ caller }) func getStrayReport(id : Nat32) : async StrayReport {
    // Anyone can view stray reports
    switch (strayReports.get(id)) {
      case (null) { Runtime.trap("Report not found") };
      case (?report) { report };
    };
  };

  public shared ({ caller }) func updateReportStatus(id : Nat32, newStatus : ReportStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can update report status");
    };
    
    switch (strayReports.get(id)) {
      case (null) { Runtime.trap("Report not found") };
      case (?report) {
        // Reporter, admin, or NGO role can update
        let isReporter = caller == report.reporter;
        let isAdmin = AccessControl.isAdmin(accessControlState, caller);
        
        // Check if user has NGO role in their profile
        let isNGO = switch (userProfiles.get(caller)) {
          case (?profile) {
            switch (profile.role) {
              case (#ngo) { true };
              case (_) { false };
            };
          };
          case (null) { false };
        };
        
        if (not (isReporter or isAdmin or isNGO)) {
          Runtime.trap("Unauthorized: Only the reporter, NGO members, or admin can update the status");
        };
        
        let updatedReport = {
          id = report.id;
          location = report.location;
          photo = report.photo;
          description = report.description;
          reporter = report.reporter;
          status = newStatus;
        };
        strayReports.add(id, updatedReport);
      };
    };
  };

  public query ({ caller }) func listStrayReports() : async [StrayReport] {
    // Anyone can view stray reports
    strayReports.values().toArray();
  };

  // Adoption Records
  public shared ({ caller }) func createAdoptionRequest(petId : Nat32) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can request adoption");
    };
    
    let id = getId();
    let record : AdoptionRecord = {
      id;
      petId;
      applicant = caller;
      status = #pending;
    };
    adoptionRecords.add(id, record);
  };

  public query ({ caller }) func getAdoptionRecord(id : Nat32) : async AdoptionRecord {
    switch (adoptionRecords.get(id)) {
      case (null) { Runtime.trap("Adoption record not found") };
      case (?record) {
        // Applicant or admin can view
        if (record.applicant != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: Only the applicant or admin can view this adoption record");
        };
        record;
      };
    };
  };

  public shared ({ caller }) func updateAdoptionStatus(id : Nat32, newStatus : AdoptionStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update adoption status");
    };
    
    switch (adoptionRecords.get(id)) {
      case (null) { Runtime.trap("Adoption record not found") };
      case (?record) {
        let updatedRecord = {
          id = record.id;
          petId = record.petId;
          applicant = record.applicant;
          status = newStatus;
        };
        adoptionRecords.add(id, updatedRecord);
      };
    };
  };

  public query ({ caller }) func listAdoptionRecords() : async [AdoptionRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can list adoption records");
    };
    
    // Users see only their own records, admins see all
    if (AccessControl.isAdmin(accessControlState, caller)) {
      adoptionRecords.values().toArray();
    } else {
      adoptionRecords.values().toArray().filter<AdoptionRecord>(func(record : AdoptionRecord) : Bool {
        record.applicant == caller;
      });
    };
  };

  // Products and Orders
  public shared ({ caller }) func addProduct(name : Text, description : Text, price : Nat32, stock : Nat32) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add products");
    };
    let id = getId();
    let product : Product = {
      id;
      name;
      description;
      price;
      stock;
    };
    products.add(id, product);
  };

  public shared ({ caller }) func updateProduct(id : Nat32, name : Text, description : Text, price : Nat32, stock : Nat32) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update products");
    };
    
    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (?_) {
        let product : Product = {
          id;
          name;
          description;
          price;
          stock;
        };
        products.add(id, product);
      };
    };
  };

  public query ({ caller }) func getProduct(id : Nat32) : async Product {
    // Anyone can view products
    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) { product };
    };
  };

  public query ({ caller }) func listProducts() : async [Product] {
    // Anyone can view products
    products.values().toArray();
  };

  public shared ({ caller }) func createOrder(productIds : [Nat32]) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can place orders");
    };
    let productsList = List.empty<Product>();
    var total : Nat32 = 0;
    for (id in productIds.values()) {
      switch (products.get(id)) {
        case (null) { Runtime.trap("Invalid product in order") };
        case (?product) {
          productsList.add(product);
          total += product.price;
        };
      };
    };
    let id = getId();
    let order : Order = {
      id;
      userId = caller;
      products = productsList.toArray();
      total;
      status = #pending;
    };
    orders.add(id, order);
  };

  public query ({ caller }) func getOrder(id : Nat32) : async Order {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can view orders");
    };
    
    switch (orders.get(id)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        // User can only view their own orders, admin can view all
        if (order.userId != caller and not AccessControl.isAdmin(accessControlState, caller)) {
          Runtime.trap("Unauthorized: You can only view your own orders");
        };
        order;
      };
    };
  };

  public query ({ caller }) func listOrders() : async [Order] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only registered users can list orders");
    };
    
    // Users see only their own orders, admins see all
    if (AccessControl.isAdmin(accessControlState, caller)) {
      orders.values().toArray();
    } else {
      orders.values().toArray().filter<Order>(func(order : Order) : Bool {
        order.userId == caller;
      });
    };
  };

  public shared ({ caller }) func updateOrderStatus(id : Nat32, newStatus : OrderStatus) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update order status");
    };
    
    switch (orders.get(id)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder = {
          id = order.id;
          userId = order.userId;
          products = order.products;
          total = order.total;
          status = newStatus;
        };
        orders.add(id, updatedOrder);
      };
    };
  };
};

document.addEventListener("DOMContentLoaded", function () {
  document.body.addEventListener("click", function (e) {
    const target = e.target;

    if (target.matches('[data-action="delete"]')) {
      const productId = target.dataset.id;
      deleteProduct(productId);
    }
  });
});

function deleteProduct(id) {
  const csrfToken = document.getElementById("csrfToken").value;

  fetch("/admin/delete-product/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CSRF-Token": csrfToken,
    },
    body: JSON.stringify({ productId: id }),
  })
    .then((res) => {
      if (!res.ok) throw new Error("Failed to delete product");
      return res.json();
    })
    .then((data) => {
      console.log("Deleted successfully", data);
      const productElement = document.querySelector(
        `[data-product-id="${id}"]`
      );
      if (productElement) {
        productElement.remove();
      }
    })
    .catch((err) => {
      console.error("Delete error:", err);
    });
}
